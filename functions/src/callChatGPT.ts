import * as functions from "firebase-functions";
import {WebClient} from "@slack/web-api";
import {verifyRequestSignature} from "@slack/events-api";
import {Configuration, OpenAIApi} from "openai";

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
const openaiConfig = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openaiClient = new OpenAIApi(openaiConfig);

export default functions.https.onRequest(async (request, response) => {
  functions.logger.info("callChatGPT called.", {structuredData: true});
  functions.logger.info(request.body, {structuredData: true});

  verifyRequestSignature({
    signingSecret: process.env.SLACK_SIGNING_SECRET ?? "",
    requestSignature: request.headers["x-slack-signature"] as string,
    requestTimestamp:
        parseInt(request.headers["x-slack-request-timestamp"] as string, 10),
    body: request.rawBody.toString(),
  });

  const body = request.body;
  if (request.headers["x-slack-retry-num"]) {
    functions.logger.info("ignore retry message.");
    response.send(body.challenge);
    return;
  }

  if (!body.event) {
    functions.logger.info("Ignore messages that do not contain event");
    response.send(body.challenge);
    return;
  }
  const text = body.event.text.replace(/<@.*>/g, "");
  functions.logger.info("input: ", text);

  const openaiResponse = await createCompletion(text);

  const threadTs = body.event.thread_ts || body.event.ts;
  if (openaiResponse !== undefined) {
    await postMessage(body.event.channel, openaiResponse, threadTs);
    response.send(request.body.challenge);
  } else {
    throw response.status(500);
  }
});

/**
 * OpenAI API呼び出し
 * @param {number} prompt OpenAIAPIへの入力テキスト
 * @return {string} OpenAIAPIからの応答
 */
async function createCompletion(prompt: string): Promise<string | undefined> {
  try {
    const response = await openaiClient.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      temperature: 0.5,
      max_tokens: 2048,
    });
    functions.logger.info("openaiResponse: ", response);
    return response.data.choices[0].text;
  } catch (err) {
    functions.logger.error(err);
    return;
  }
}

/**
 * Slackへ投稿する
 * @param {string} channel Slackチャネル
 * @param {string} text メッセージ
 * @param {string} threadTs スレッドタイムスタンプ
 */
async function postMessage(channel: string, text: string, threadTs: string) {
  try {
    const payload = {
      channel: channel,
      text: text,
      as_user: true,
      thread_ts: threadTs,
    };
    const response = await slackClient.chat.postMessage(payload);
    functions.logger.info("slackResponse: ", response);
  } catch (err) {
    functions.logger.error(err);
  }
}
