import "dotenv/config";
import express from "express";
import cors from "cors";
import { Copilot } from "monacopilot";
import {SYSTEM_PROMPT} from "./systemPrompt.js";
import {INLINE_SYSTEM_PROMPT} from "./inlineSystemPrompt.js";
import {INLINE_SYSTEM_CONTEXT} from "./inlineSystemContext.js";
const app = express();
const port = process.env.PORT || 3000;

// Environment validation
if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is not defined");
}

// Initialize clients
const copilot = new Copilot(process.env.GROQ_API_KEY, {
  provider: "groq",
  model: "llama-3-70b",
});

// System prompt for chat endpoint

// Configure CORS
app.use(
  cors({
    origin: ["http://localhost:3000", "https://yourdomain.com"],
    methods: ["POST", "GET", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  }),
);

app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/complete", async (req, res) => {
  try {
    const { completion, error, raw } = await copilot.complete({
      body: req.body,
      options: {
        customPrompt: metadata => ({
          system: INLINE_SYSTEM_CONTEXT + "\n" + INLINE_SYSTEM_PROMPT,
        }),
      },
    });

    if (raw) {
      calculateCost(raw.usage.total_tokens);
    }

    if (error) {
      console.error("Completion error:", error);
      return res.status(500).json({ completion: null, error });
    }

    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Credentials", "true");

    return res.status(200).json({ completion });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      completion: null,
      error: "Internal server error",
    });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const { message, fileContext, visibleRange, chat } = req.body;

    //const prompt = constructPrompt(
    //  message,
    //  fileContext,
    //  //currentFile,
    //  visibleRange,
    //);

    const system = { role: "system", content: SYSTEM_PROMPT };

    // chat is a json array, append system prompt to the beginning of the array
    const messages = chat ? [system, ...chat] : [system];

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages,
          model: "llama3-8b-8192",
          temperature: 1,
          max_tokens: 1024,
          top_p: 1,
          stream: false,
          stop: null,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Groq API response:", errorData);
      throw new Error(`Groq API error: ${response.statusText} - ${errorData}`);
    }

    const completion = await response.json();

    if (completion.choices?.[0]?.message?.content) {
      if (completion.usage) {
        calculateCost(completion.usage.total_tokens);
      }

      res.header("Access-Control-Allow-Origin", req.headers.origin);
      res.header("Access-Control-Allow-Credentials", "true");

      return res.status(200).json({
        response: completion.choices[0].message.content,
        fileContext: fileContext,
      });
    }

    throw new Error("No completion generated");
  } catch (err) {
    console.error("Chat error:", err);
    return res.status(500).json({
      response: null,
      error: err.message,
    });
  }
});

// Helper Functions
function constructPrompt(message, fileContext, currentFile = "", visibleRange) {
  let contextualPrompt = "";

  if (currentFile) {
    contextualPrompt += `Current file: ${currentFile}\n`;
  }
  if (fileContext) {
    contextualPrompt += `File context: ${JSON.stringify(fileContext)}\n`;
  }
  if (visibleRange) {
    contextualPrompt += `Visible range: ${JSON.stringify(visibleRange)}\n`;
  }

  contextualPrompt += `\nUser message: ${message}`;
  return contextualPrompt;
}

function calculateCost(tokens) {
  console.log(`Token usage: ${tokens}`);
}

// CORS Options handlers
app.options("/complete", cors());
app.options("/chat", cors());

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

