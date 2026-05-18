const axios = require("axios");

const MODELS = {
  plan: "google/gemma-4-31b-it",
  build: "deepseek/deepseek-v4-flash",
  refine: "qwen/qwen-coder"
};

// 🧠 Step 1: classify task
async function classifyTask(prompt) {
  try {
    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemma-4-31b-it",
        messages: [
          {
            role: "system",
            content:
              "Classify the task into ONE word only: plan, build, or refine."
          },
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.data.choices[0].message.content.trim().toLowerCase();
  } catch (err) {
    console.log("❌ classifyTask error:");
    console.log(err.response?.data || err.message);
    return "build"; // fallback
  }
}

// ⚙️ Step 2: pick model
function pickModel(type) {
  return MODELS[type] || MODELS.build;
}

// 🚀 Step 3: run router
async function runRouter(prompt) {
  const taskType = await classifyTask(prompt);
  const model = pickModel(taskType);

  console.log("🧠 Task Type:", taskType);
  console.log("⚙️ Model Used:", model);

  try {
    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model,
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.data.choices[0].message.content;
  } catch (err) {
    console.log("❌ runRouter error:");
    console.log(err.response?.data || err.message);
    return "Error generating response";
  }
}

// 🧪 test
runRouter("Build SaaS dashboard with login system")
  .then((res) => console.log("\n💡 RESULT:\n", res))
  .catch((err) => console.error(err));