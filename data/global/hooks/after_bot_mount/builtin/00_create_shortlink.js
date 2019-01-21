//CHECKSUM:5670b6b00064d8d2ee8097ea77d26d94c21325a34e524a1c9e54dcd4d25d390a
"use strict";

const chatOptions = {
  hideWidget: true,
  config: {
    botConvoTitle: 'Bot Emulator',
    enableReset: true,
    enableTranscriptDownload: true
  }
};
const params = {
  m: 'channel-web',
  v: 'fullscreen',
  options: JSON.stringify(chatOptions) // Bot will be available at $EXTERNAL_URL/s/$BOT_NAME

};
bp.http.createShortLink(botId, `${process.EXTERNAL_URL}/lite/${botId}/`, params);