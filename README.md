## functions setup
```bash
# install
cd functions
yarn
```
## deploy to firebase
Key to be used for env is prepared in advance.
```bash
# copy template
cp -p .env.template .env
# edit .env
vi .env
```
SLACK_BOT_TOKEN=`Slack app Bot User OAuth Token pasted.`
SLACK_SIGNING_SECRET=`Slack app Credentials Signing Secret pasted.`
OPENAI_API_KEY=[OpenAO API keys pasted.](https://beta.openai.com/account/api-keys)

```bash
yarn deploy
```
## callChatGPT
Functions for Bot to link Slack and ChatGPT
