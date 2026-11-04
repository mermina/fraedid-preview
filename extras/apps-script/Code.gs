/**
 * Fræið: receives the two website forms (booking request + course waiting list).
 * Stage 1 of output/2026-11-03_automations-plan.md. Lives inside Emilia's Google Sheet
 * "Fræið – skjólstæðingar (EINKA)" → Extensions → Apps Script. Setup: README.md next to this file.
 *
 * For each form it: 1) adds a row to the right tab, 2) emails Emilia, 3) sends the auto-reply.
 * Field names match templates/macros.html on the website.
 */

// ---- settings (the only part to change) ----
var EMILIA_EMAIL = "emilia@sjalfsvitund.is";   // Emilia, 4 Nov: booking requests go here (her main Fræið address)
var REPLY_HOURS = 48;           // promised reply time (also in content/site.yml)
var SIGNATURE = "Emilía\nFræið · Þar sem sjálfsvitundin vex\nsjalfsvitund.is · 894-5100";
var SIGNATURE_EN = "Emilia\nFræið · Where self-awareness grows\nsjalfsvitund.is · +354 894-5100";

var TABS = {
  booking: { name: "Beiðnir", header: ["Dags. beiðni", "Nafn", "Netfang", "Sími", "Þjónusta", "Fjöldi", "Hentar", "Skilaboð",
             "Eftirfylgni ✔", "Tilboð ✔", "Tungumál", "Staða", "Dags. tíma", "Greitt", "Mætti", "Eftirfylgni send", "Umsögn"] },
  waitlist: { name: "Biðlisti", header: ["Dags.", "Nafn", "Netfang", "Skilaboð", "Tilboð ✔", "Tungumál"] }
};

function doPost(e) {
  var p = (e && e.parameter) || {};
  if (p.website) return ok_();                       // honeypot filled: a bot, ignore quietly
  if (!p.name || !p.email || !TABS[p.form]) return ok_();

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = tab_(p.form);
    var now = new Date();
    var yes = function (v) { return v === "yes"; };
    if (p.form === "booking") {
      // Booking form has no tick boxes (Marina, 4 Nov): clients are told under the form that they get a
      // follow-up and occasional news, and can unsubscribe in every email (soft opt-in). Untick to stop.
      sheet.appendRow([now, p.name, p.email, p.phone || "", p.service || "", p.sessions || "", p.when || "", p.message || "",
                       true, true, p.lang || "is", "Ný", "", false, false, "", ""]);
    } else {
      sheet.appendRow([now, p.name, p.email, p.message || "", yes(p.newsletter), p.lang || "is"]);
    }
    var rowUrl = SpreadsheetApp.getActive().getUrl() + "#gid=" + sheet.getSheetId() + "&range=A" + sheet.getLastRow();
    notifyEmilia_(p, rowUrl);
    autoReply_(p);
  } finally {
    lock.releaseLock();
  }
  return ok_();
}

function notifyEmilia_(p, rowUrl) {
  var to = EMILIA_EMAIL || Session.getEffectiveUser().getEmail();
  var subject = p.form === "booking"
    ? "Ný bókunarbeiðni: " + p.name + " · " + (p.service || "")
    : "Nýr á biðlista: " + p.name;
  var lines = [
    "Nafn: " + p.name, "Netfang: " + p.email,
    p.phone ? "Sími: " + p.phone : "", p.service ? "Þjónusta: " + p.service : "",
    p.sessions ? "Fjöldi tíma: " + p.sessions : "", p.when ? "Hentar: " + p.when : "",
    p.message ? "\nSkilaboð:\n" + p.message : "",
    p.form === "waitlist" ? "\nFréttir og tilboð: " + (p.newsletter === "yes" ? "já" : "nei") : "",
    "Tungumál: " + (p.lang || "is"),
    "\nOpna í skjalinu: " + rowUrl
  ];
  MailApp.sendEmail({ to: to, subject: subject, body: lines.filter(String).join("\n"), replyTo: p.email });
}

function autoReply_(p) {
  var first = String(p.name).trim().split(/\s+/)[0];
  var en = p.lang === "en";
  var subject, body;
  if (p.form === "booking") {
    subject = en ? "Thank you, I have received your request" : "Takk fyrir, ég hef fengið beiðnina þína";
    body = en
      ? "Hi " + first + ",\n\nThank you for getting in touch. I have received your request and will contact you within " + REPLY_HOURS +
        " hours to find a time that suits you.\n\nI see clients at Ármúli 23, 108 Reykjavík.\n\nWarm wishes,\n" + SIGNATURE_EN
      : "Hæ " + first + ",\n\nTakk fyrir að hafa samband. Ég hef fengið beiðnina þína og hef samband við þig innan " + REPLY_HOURS +
        " klukkustunda til að finna tíma sem hentar.\n\nÉg tek á móti þér í Ármúla 23, 108 Reykjavík.\n\nHlýjar kveðjur,\n" + SIGNATURE;
  } else {
    subject = en ? "You're on the Fræið waiting list" : "Þú ert komin(n) á biðlistann hjá Fræinu";
    body = en
      ? "Hi " + first + ",\n\nThank you for your interest! You are on the waiting list and will be among the first to hear when the courses begin.\n\nWarm wishes,\n" + SIGNATURE_EN
      : "Hæ " + first + ",\n\nTakk fyrir áhugann! Þú ert komin(n) á biðlistann og verður meðal þeirra fyrstu til að frétta þegar námskeiðin fara af stað.\n\nHlýjar kveðjur,\n" + SIGNATURE;
  }
  var mail = { to: p.email, subject: subject, body: body, name: "Emilía · Fræið" };
  if (EMILIA_EMAIL) mail.replyTo = EMILIA_EMAIL;
  MailApp.sendEmail(mail);
}

// Returns the tab for this form, creating it with a header row the first time.
function tab_(form) {
  var ss = SpreadsheetApp.getActive();
  var t = TABS[form];
  var sheet = ss.getSheetByName(t.name);
  if (!sheet) {
    sheet = ss.insertSheet(t.name);
    sheet.appendRow(t.header);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, t.header.length).setFontWeight("bold");
  }
  return sheet;
}

function ok_() {
  return ContentService.createTextOutput("ok");
}

// Run once by hand from the editor (▶ testBooking) to check the sheet + both emails, using your own address.
function testBooking() {
  doPost({ parameter: { form: "booking", lang: "is", name: "Prufa Prufudóttir", email: Session.getEffectiveUser().getEmail(),
                        phone: "000-0000", service: "Klínísk dáleiðsla", message: "Prufa" } });
}
