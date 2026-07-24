// Serverless caption endpoint for the AI Meme Machine (Azure Static Web Apps
// managed Functions runtime, Node 18+, so the global `fetch` is available
// without any extra dependency).

const FALLBACK_CAPTIONS = [
  "when the wifi drops for two seconds",
  "me pretending I read the whole email",
  "that face when Monday shows up early",
  "nobody: ... this guy:",
  "when you say 'just five more minutes' at 2am",
  "the confidence of someone who did not test the code",
  "when the meeting could've been an email",
  "POV: you just hit reply-all by accident"
];

function randomFallback() {
  return FALLBACK_CAPTIONS[Math.floor(Math.random() * FALLBACK_CAPTIONS.length)];
}

module.exports = async function (context, req) {
  const imageBase64 = req.body && req.body.imageBase64;

  if (!imageBase64) {
    context.res = { status: 400, body: { error: "No image provided" } };
    return;
  }

  const endpoint = (process.env.AZURE_CV_ENDPOINT || "").replace(/\/$/, "");
  const key = process.env.AZURE_CV_KEY || "";

  // No Azure Computer Vision configured yet -> offline demo mode.
  if (!endpoint || !key) {
    context.res = { status: 200, body: { caption: randomFallback(), source: "fallback" } };
    return;
  }

  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const url = `${endpoint}/computervision/imageanalysis:analyze?api-version=2023-10-01&features=caption`;
    const azureRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Ocp-Apim-Subscription-Key": key
      },
      body: buffer
    });

    if (!azureRes.ok) {
      const text = await azureRes.text();
      context.log.error("Azure Computer Vision error:", azureRes.status, text);
      context.res = {
        status: 200,
        body: { caption: randomFallback(), source: "fallback", note: "Azure call failed, used fallback" }
      };
      return;
    }

    const data = await azureRes.json();
    const caption = (data && data.captionResult && data.captionResult.text) || randomFallback();

    context.res = {
      status: 200,
      body: {
        caption,
        source: "azure-computer-vision",
        confidence: data && data.captionResult && data.captionResult.confidence
      }
    };
  } catch (err) {
    context.log.error("Caption error:", err);
    context.res = {
      status: 200,
      body: { caption: randomFallback(), source: "fallback", note: "Exception, used fallback" }
    };
  }
};
