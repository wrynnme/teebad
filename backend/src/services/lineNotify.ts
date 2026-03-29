// ============================================================
// TeeBad — LINE Service Message Templates
// ใช้ LINE Messaging API — Service Messages (ฟรี)
// ============================================================

interface SendServiceMessageParams {
  userId: string;
  messages: LineMessage[];
}

interface LineMessage {
  type: 'text' | 'flex';
  text?: string;
  altText?: string;
  contents?: object;
}

// ============================================================
// Helper — ส่ง Service Message ผ่าน LINE API
// ============================================================
async function sendServiceMessage(params: SendServiceMessageParams): Promise<boolean> {
  const { userId, messages } = params;
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!channelAccessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN not set');
    return false;
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({ to: userId, messages }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      console.error('LINE push failed:', response.status, JSON.stringify(body));
      return false;
    }

    return true;
  } catch (err) {
    console.error('LINE sendServiceMessage error:', err);
    return false;
  }
}

// ============================================================
// Template 1: ยืนยันการลงทะเบียน
// ============================================================
export async function notifyRegistrationConfirmed(params: {
  userId: string;
  displayName: string;
  sessionName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
}): Promise<boolean> {
  const { userId, displayName, sessionName, sessionDate, startTime, endTime } = params;

  return sendServiceMessage({
    userId,
    messages: [
      {
        type: 'text',
        text: `✅ ลงชื่อสำเร็จ!\n\nสวัสดี ${displayName}\nคุณได้ลงชื่อเข้าร่วมก๊วน:\n📍 ${sessionName}\n📅 ${sessionDate}\n🕐 ${startTime} – ${endTime}\n\nเจอกันนะ! 🏸`,
      },
    ],
  });
}

// ============================================================
// Template 2: ยืนยันการชำระเงิน
// ============================================================
export async function notifyPaymentApproved(params: {
  userId: string;
  displayName: string;
  sessionName: string;
  amount: number;
}): Promise<boolean> {
  const { userId, displayName, sessionName, amount } = params;

  return sendServiceMessage({
    userId,
    messages: [
      {
        type: 'text',
        text: `💚 ยืนยันการชำระเงินแล้ว!\n\nสวัสดี ${displayName}\nได้รับเงิน ${amount.toLocaleString()} บาท\nสำหรับก๊วน: ${sessionName}\n\nขอบคุณนะ! 🙏`,
      },
    ],
  });
}

// ============================================================
// Template 3: บิลส่วนตัว (personal bill)
// ============================================================
export async function notifyPersonalBill(params: {
  userId: string;
  displayName: string;
  sessionName: string;
  sessionDate: string;
  gamesPlayed: number;
  amountDue: number;
  billingMode: 'equal' | 'by_games';
  promptpayNumber?: string;
}): Promise<boolean> {
  const {
    userId,
    displayName,
    sessionName,
    sessionDate,
    gamesPlayed,
    amountDue,
    billingMode,
    promptpayNumber,
  } = params;

  const modeText = billingMode === 'equal' ? 'หารเท่า' : `${gamesPlayed} เกม`;
  const payText = promptpayNumber
    ? `\nพร้อมเพย์: ${promptpayNumber}`
    : '';

  return sendServiceMessage({
    userId,
    messages: [
      {
        type: 'text',
        text: `🏸 บิลค่าแบดมินตัน\n\nสวัสดี ${displayName}\nก๊วน: ${sessionName}\nวันที่: ${sessionDate}\nคิดเงินแบบ: ${modeText}\n\n💰 ยอดที่ต้องชำระ: ${amountDue.toLocaleString()} บาท${payText}\n\nกรุณาชำระภายใน 24 ชั่วโมง 🙏`,
      },
    ],
  });
}

// ============================================================
// Template 4: แจ้งเตือนค้างชำระ
// ============================================================
export async function notifyOutstandingReminder(params: {
  userId: string;
  displayName: string;
  sessionName: string;
  amountDue: number;
}): Promise<boolean> {
  const { userId, displayName, sessionName, amountDue } = params;

  return sendServiceMessage({
    userId,
    messages: [
      {
        type: 'text',
        text: `⚠️ ยังมียอดค้างชำระ\n\nสวัสดี ${displayName}\nก๊วน: ${sessionName}\nยอดค้าง: ${amountDue.toLocaleString()} บาท\n\nกรุณาชำระด้วยนะ ขอบคุณ 🙏`,
      },
    ],
  });
}

// ============================================================
// Template 5: เตือนก่อนถึงวันก๊วน
// ============================================================
export async function notifySessionReminder(params: {
  userId: string;
  displayName: string;
  sessionName: string;
  sessionDate: string;
  startTime: string;
}): Promise<boolean> {
  const { userId, displayName, sessionName, sessionDate, startTime } = params;

  return sendServiceMessage({
    userId,
    messages: [
      {
        type: 'text',
        text: `🏸 เตือนความจำ!\n\nสวัสดี ${displayName}\nพรุ่งนี้มีก๊วน:\n📍 ${sessionName}\n📅 ${sessionDate}\n🕐 ${startTime}\n\nอย่าลืมนะ! 😊`,
      },
    ],
  });
}

// ============================================================
// Khunthong — สร้างคำสั่งสำเร็จรูปให้ก็อปวางในกลุ่ม LINE
// ไม่มี Public API — ระบบสร้าง text ให้ admin copy เท่านั้น
// ============================================================
export function buildKhunthongCommand(params: {
  type: 'split' | 'remind';
  sessionName: string;
  players: Array<{ displayName: string; amount: number }>;
  promptpayNumber?: string;
}): string {
  const { type, sessionName, players, promptpayNumber } = params;

  if (type === 'remind') {
    const list = players
      .map((p, i) => `${i + 1}. ${p.displayName} ${p.amount.toLocaleString()} บาท`)
      .join('\n');
    return `📢 ทวงเงินค่าแบด "${sessionName}"\n\n${list}\n\nโปรดโอนด้วยนะครับ 🙏`;
  }

  // type === 'split'
  const list = players
    .map((p, i) => `${i + 1}. ${p.displayName} = ${p.amount.toLocaleString()} บาท`)
    .join('\n');

  const payLine = promptpayNumber ? `\n\nพร้อมเพย์: ${promptpayNumber}` : '';

  return `🏸 บิลค่าแบดมินตัน "${sessionName}"\n\n${list}${payLine}`;
}
