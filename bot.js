var token = "{telegram_bot_token}";  // Ini adalah API dari Bot Telegram
var telegramUrl = "https://api.telegram.org/bot"+ token;

// run this webAppUrl once your script deployed, and replace this webAppUrl with the url deployed, and run using run -> setWebhook
var webAppUrl = "{webhook google}";

var ssId = "{google_app_script_id}"; // Ini adalah ID dari google Sheet
var spreadsheetLink = "{google_spreedsheet_url}";
var botUserName = "{bot_username}";

function sendReportTelegramReminderToCreateReport() {
  const store = PropertiesService.getScriptProperties();
  const chatId = store.getProperty("TELEGRAM_CHAT_ID");

  Logger.log("Stored chat ID: " + chatId);
  if (chatId == null) {
    Logger.log("Chat ID is null");
    return;
  }

  const reminderMessage =
    "Hi @nabitaayu ini pengingat untuk menghitung total pendapatan hari ini. Berapa pemasukan hari ini? ";

  sendText(chatId, reminderMessage);
}

function sendReportTelegramReminderToInput() {
  const store = PropertiesService.getScriptProperties();
  const chatId = store.getProperty("TELEGRAM_CHAT_ID");

  Logger.log("Stored chat ID: " + chatId);
  if (chatId == null) {
    Logger.log("Chat ID is null");
    return;
  }

  const reminderMessage =
    "Hi pagi @nabitaayu ini pengingat untuk input orang yang main hari ini ya";

  sendText(chatId, reminderMessage);
}

function createTriggerForReminder() {
  const date = new Date();
  date.setHours(20);
  date.setMinutes(0);
  date.setSeconds(0);
  
  const store = PropertiesService.getScriptProperties();
  const chatId = store.getProperty("TELEGRAM_CHAT_ID");
  Logger.log("Stored chat ID: " + chatId); 

  ScriptApp.newTrigger("sendReportTelegramReminderToCreateReport")
           .timeBased()
           .at(date)
           .create();

  date.setHours(8);
  ScriptApp.newTrigger("sendReportTelegramReminderToInput")
           .timeBased()
           .at(date)
           .create();
}

function getMe() {
  var url = telegramUrl + "/getMe";
  var response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}

function setWebhook() {
  var url = telegramUrl + "/setWebhook?url=" + webAppUrl;
  var response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}

function sendText(id,text) {
  var url = telegramUrl + "/sendMessage?chat_id=" + id + "&text=" + encodeURIComponent(text);
  var response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}

function doGet(e) {
  return HtmlService.createHtmlOutput("Hi there");
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const message = data.message;
    const text = message.text;
    const chatId = message.chat.id;
    const senderName = message.from.first_name || "User";

    // Store to PropertiesService
    const store = PropertiesService.getScriptProperties();
    store.setProperty("TELEGRAM_CHAT_ID", chatId.toString());

    // Function to check if the bot is mentioned in a group
    const isGroupChat = chatId < 0; // Telegram group chats have negative chat IDs
    const botUsername = botUserName; // Replace with the actual bot username
    const isMentioned = isGroupChat && text && text.includes(botUsername);

    if (isGroupChat && !isMentioned) {
      // Ignore messages in group chats unless the bot is mentioned
      return;
    }

    if (!text) {
      sendText(chatId, "Pesan kosong tidak dapat diproses.");
      return;
    }

    if (text.includes("help")) {
      sendHelpText(chatId);
      return;
    }

    if (!text.includes("/") || !text.includes(":")) {
      sendFormatError(chatId);
      return;
    }

    const [command, params] = text.split(":", 2);
    const execCommand = command.substring(1).toLowerCase().trim();

    if (!params) {
      sendFormatError(chatId);
      return;
    }

    const datas = params.split(",").map(param => param.trim());

    if (execCommand.includes("main")) {
      handleMainCommand(chatId, senderName, datas);
    } else if (execCommand.includes("makan_minum")) {
      handleMakanMinumCommand(chatId, senderName, datas);
    } else {
      sendText(chatId, "Perintah tidak diketahui atau belum tersedia.");
    }
  } catch (error) {
    sendText(chatId, "Terjadi kesalahan: " + error.message);
  }
}

function sendHelpText(chatId) {
  const helpMessage =
    "Hi, selamat datang di Davraz Playpoint Bot.\n" +
    "Bot akan membantu kamu membuat pencatatan langsung ke sheet. Silahkan pilih perintah berikut:\n\n" +
    "- Main: /main:PSA,1,Razky\n" +
    "- Makan/Minum: /makan_minum:Mie,makanan,1,5000\n\n" +
    "Contoh:\n" +
    "/main:PSA,1,Razky\n" +
    "/makan_minum:Granita,minuman,1,2000";

  sendText(chatId, helpMessage);
}

function sendFormatError(chatId) {
  const errorMessage =
    "Format pesan salah. Harap ikuti format:\n\n" +
    "- Main: /main:{PS},{Durasi},{Nama}\n" +
    "- Makan/Minum: /makan_minum:{Item},{Tipe},{Jumlah},{Harga}\n\n" +
    "Contoh:\n" +
    "/main:PSA,1,Razky\n" +
    "/makan_minum:Granita,minuman,1,2000";

  sendText(chatId, errorMessage);
}

function handleMainCommand(chatId, senderName, datas) {
  if (datas.length !== 3) {
    sendText(chatId, `Data yang dimasukan harus terdiri dari 3 kolom. Contoh: /main:PSA,1,Razky`);
    return;
  }

  const [psType, durationText, playerName] = datas;
  const duration = parseInt(durationText);
  const validPSTypes = ["psa", "psb", "psc", "psd"];

  if (!validPSTypes.includes(psType.toLowerCase())) {
    sendText(chatId, "Tipe PS tidak valid. Masukan PSA, PSB, PSC, atau PSD.");
    return;
  }

  const pricePerHour = 6000;
  var totalPrice = 0;

  if (duration == 30) {
    totalPrice = 3000;
  } else if (isNaN(duration) || duration < 1 || duration > 4) {
    sendText(chatId, "Durasi bermain harus antara 1 hingga 4 jam.");
    return;
  }

  if (totalPrice == 0) {
    totalPrice = pricePerHour * duration
  }

  const now = new Date();
  const sheetName = `${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getFullYear()}`;
  const sheet = getOrCreateSheet(sheetName, [
    "Nama PS",
    "Durasi Main",
    "Mulai Main",
    "Berhenti Main",
    "Nama Pemain",
    "Harga Perjam",
    "Total Bayar",
    "Tanggal Data Input",
    "Dibuat Oleh",
  ]);

  const startTime = formatTime(now);
  const endTime = formatTime(new Date(now.setHours(now.getHours() + duration)));
  

  sheet.appendRow([
    psType.toUpperCase(),
    duration,
    startTime,
    endTime,
    playerName,
    pricePerHour,
    totalPrice,
    new Date(),
    senderName,
  ]);

  sendText(chatId, `Hi ${senderName}, data berhasil ditambahkan ke spreadsheet.
  Click disini untuk melihat hasil laporan
  ${spreadsheetLink}`);
}

function handleMakanMinumCommand(chatId, senderName, datas) {
  if (datas.length !== 4) {
    sendText(chatId, `Data yang dimasukan harus terdiri dari 4 kolom. Contoh: /makan_minum:Granita,minuman,1,2000`);
    return;
  }

  const [itemName, itemType, quantityText, priceText] = datas;
  const quantity = parseInt(quantityText);
  const price = parseInt(priceText);

  if (!["makanan", "minuman"].includes(itemType.toLowerCase())) {
    sendText(chatId, "Tipe item harus makanan atau minuman.");
    return;
  }

  if (isNaN(quantity) || isNaN(price) || quantity < 1 || price < 1) {
    sendText(chatId, "Jumlah dan harga harus berupa angka positif.");
    return;
  }

  const now = new Date();
  const sheetName = `${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getFullYear()}_makan_minum`;
  const sheet = getOrCreateSheet(sheetName, [
    "Nama Item",
    "Tipe",
    "Kuantiti",
    "Harga Satuan",
    "Harga Total",
    "Tanggal Data Input",
    "Dibuat Oleh",
  ]);

  sheet.appendRow([
    itemName,
    itemType,
    quantity,
    price,
    quantity * price,
    new Date(),
    senderName,
  ]);

  sendText(chatId, `Hi ${senderName}, data berhasil ditambahkan ke spreadsheet. :)
  
  Click disini untuk melihat laporan:
  ${spreadsheetLink}`);
}

function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.openById(ssId);
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function formatTime(date) {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}
