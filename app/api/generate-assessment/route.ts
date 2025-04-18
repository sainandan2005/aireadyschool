import { NextResponse } from "next/server"
import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/server"
import { logTokenUsage } from "@/utils/logTokenUsage"

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: Request) {
  try {
    // Get authenticated user
    const supabaseAuth = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Destructure the incoming request body.
    // For mixed assessments, expect a `mixedQuestionCount` object.
    const {
      country,
      board,
      classLevel,
      subject,
      topic,
      assessmentType,
      difficulty,
      questionCount,
      mixedQuestionCount,
      learningOutcomes,
    } = await req.json()

    let prompt = `Generate a ${difficulty} difficulty ${subject} assessment for ${classLevel} students in ${country} following the ${board} curriculum, on the topic of "${topic}" with `

    if (assessmentType === "mixedassessment") {
      // Compute the total number of questions from mixedQuestionCount
      const totalQuestionCount = (Object.values(mixedQuestionCount) as number[]).reduce(
        (acc, curr) => acc + curr,
        0,
      )
      prompt += `${totalQuestionCount} questions. `
      prompt += `The assessment should address the following learning outcomes:\n${(learningOutcomes as string[])
        .map((outcome: string, index: number) => `${index + 1}. ${outcome}`)
        .join("\n")}\n\n`
      // Explicitly instruct the AI to generate the specified number of questions per type
      prompt += `Generate exactly ${mixedQuestionCount.mcq} MCQs and ${mixedQuestionCount.shortanswer} Short Answer questions. `
      prompt += `For MCQs: Provide 4 options (A, B, C, D) with one correct answer. `
      prompt += `For Short Answer: Provide a concise question with its correct answer. `
      prompt += `Format the output as a JSON array of objects. Each object must include a 'questionType' field (with value "MCQ" or "Short Answer") along with the appropriate fields for that type.`
    } else {
      prompt += `${questionCount} questions. `
      prompt += `The assessment should address the following learning outcomes:\n${(learningOutcomes as string[])
        .map((outcome: string, index: number) => `${index + 1}. ${outcome}`)
        .join("\n")}\n\n`
      switch (assessmentType) {
        case "mcq":
          prompt += `Create multiple-choice questions. For each question, provide 4 options (A, B, C, D) with one correct answer. Format the output as a JSON array of objects, where each object has 'question', 'options' (an array of 4 strings), and 'correctAnswer' (index of the correct option) fields.`
          break
        case "truefalse":
          prompt += `Create true/false questions. Format the output as a JSON array of objects, where each object has 'question' and 'correctAnswer' (boolean) fields.`
          break
        case "fillintheblank":
          prompt += `Create fill-in-the-blank questions. Format the output as a JSON array of objects, where each object has 'question' (with a blank represented by '___'), 'answer' (the correct word or phrase to fill the blank), and 'options' (an array of 4 strings including the correct answer) fields.`
          break
        case "shortanswer":
          prompt += `Create short answer questions. For each question, provide a brief question and its correct answer. Format the output as a JSON array of objects, where each object has 'question' and 'answer' fields.`
          break
        default:
          throw new Error("Invalid assessment type")
      }
    }


    const { text, usage } = await generateText({
      model: anthropic("claude-3-7-sonnet-20250219"),
      prompt: prompt,
      temperature: 0.9,
      maxTokens: 6000,
    })

    // Log token usage with authenticated user's email
    if (usage) {
      await logTokenUsage("Assessment Generator", "claude-3-7-sonnet-20250219", usage.promptTokens, usage.completionTokens, user.email)
    }

    // Extract JSON from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("No valid JSON found in the response")
    }
    const assessment = JSON.parse(jsonMatch[0])
    if (!Array.isArray(assessment)) {
      throw new Error("Invalid assessment format: Expected an array of questions")
    }

    // For mixed assessments, compute the total question count; otherwise, use the provided questionCount.
    const totalQuestionCount = assessmentType === "mixedassessment"
      ? (Object.values(mixedQuestionCount) as number[]).reduce((acc, curr) => acc + curr, 0)
      : questionCount

    // Insert using the existing column "question_count" (adjust this to your actual schema)
    const { data, error } = await supabase
      .from("assessments")
      .insert({
        country,
        board,
        class_level: classLevel,
        subject,
        topic,
        assessment_type: assessmentType,
        difficulty,
        questions: assessment,
        learning_outcomes: learningOutcomes,
        user_email: user.email,
      })
      .select()

    if (error) {
      console.error("Supabase error:", error)
      throw new Error(`Failed to save assessment: ${error.message}`)
    }

    return NextResponse.json({ assessment, id: data[0].id })
  } catch (error) {
    console.error("Error generating assessment:", error)

    let errorMessage = "An unexpected error occurred while generating the assessment."
    let statusCode = 500
    let errorDetails = "An unknown error occurred"

    if (error instanceof Error) {
      errorDetails = error.message
      if (
        error.message.includes("insufficient_quota") ||
        error.message.includes("exceeded your current quota")
      ) {
        errorMessage = "You have exceeded your API quota. Please try again later or contact support."
        statusCode = 429
      } else if (error.message.includes("No valid JSON found")) {
        errorMessage = "The AI model returned an invalid response. Please try again."
        statusCode = 422
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorDetails : undefined,
      },
      { status: statusCode },
    )
  }
}

export async function PUT(req: Request) {
  try {
    const supabaseAuth = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, questions, answers, submitted } = await req.json()

    const updateData: any = {}
    if (questions) updateData.questions = questions

    // If the client is marking submission, update submitted field to true.
    if (submitted === true) {
      updateData.submitted = true
    }

    if (answers) {
      // Fetch existing assessment record to verify submission state
      const { data: existingRecord, error: fetchError } = await supabase
        .from("assessments")
        .select("answers, questions, submitted")
        .eq("id", id)
        .single()
      if (fetchError) {
        throw fetchError
      }
      // If the assessment is already submitted, do not allow editing
      if (existingRecord.submitted) {
        return NextResponse.json({ error: "Assessment already submitted" }, { status: 403 })
      }
      const existingAnswers: any[] =
        existingRecord.answers ||
        new Array(existingRecord.questions.length).fill(undefined)
      // Merge only non-null, non-undefined answers
      const mergedAnswers = existingAnswers.map((prev, idx) => {
        const newAns = answers[idx]
        return newAns !== null && newAns !== undefined ? newAns : prev
      })
      updateData.answers = mergedAnswers
    }

    const { data, error } = await supabase
      .from("assessments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error("Assessment not found")
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error updating assessment:", error)
    return NextResponse.json(
      {
        error: "Failed to update assessment",
        details: error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 },
    )
  }
}
