module.exports = async function (context, req) {
  const azureConfigured = Boolean(process.env.AZURE_CV_ENDPOINT && process.env.AZURE_CV_KEY);
  context.res = { status: 200, jsonBody: { ok: true, azureConfigured } };
};
