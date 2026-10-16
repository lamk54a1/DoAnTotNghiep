const normalize = (value) => String(value || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

// History may resolve a short follow-up, never override an explicit new topic.
const isFollowUp = (text) => /\b(tran (do|nay|ay)|doi (do|nay|ay)|anh ay|cau ay|nguoi do)\b/.test(text)
  || /^(con )?(gia (ve )?(thi )?sao|gia ve bao nhieu|bao nhieu( tien| tuoi| ve)?|o dau|khi nao|may gio|so may|que o dau|ai|nguoi nao|con ve khong)[?!.\s]*$/.test(text);

const classifyQuestion = ({ text, historyText = '', hasSelectedMatch = false }) => {
  text = normalize(text);
  historyText = normalize(historyText);
  if (/\b(dang nhap|mat khau|email|tai khoan|thong tin ca nhan)\b/.test(text)) return 'ACCOUNT';
  if (/\b(cccd|can cuoc|xac minh|duyet danh tinh)\b/.test(text)) return 'CCCD';
  if (/\b(hoan ve|huy ve|hoan tien|chinh sach|quy dinh|gioi han|luu y)\b/.test(text)) return 'POLICY';
  if (/\b(thanh toan|chuyen khoan|don hang|het han|xac nhan thanh cong|sepay)\b/.test(text)) return 'PAYMENT';
  if (/\b(ve cua toi|ve da mua|ma qr|qr ve|in pdf|xem ve)\b/.test(text)) return 'MY_TICKETS';
  if (/\b(con bao nhieu ve|con ve|het ve|so ve|ve trong|ve con lai|ton kho)\b/.test(text)) return 'TICKET_AVAILABILITY';
  if (/\b(gia ve|ve gia|gia.*khan dai|khan dai.*(gia|bao nhieu)|mien phi.*khan dai|ve.*bao nhieu|bao nhieu.*(tien|dong))\b/.test(text)) return 'TICKET_PRICE';
  if (/\b(mua ve|dat ve|chon ghe|giu ghe)\b/.test(text)) return 'BUY_TICKET';
  if (/\b(nha tai tro|tai tro|sponsor|doi tac)\b/.test(text)) return 'SPONSORS';
  if (/\b(lien he|cong ty|mst|ma so thue|hotline)\b/.test(text)) return 'CONTACT';
  if (/\b(chuyen nhuong|chan thuong|hlv|huan luyen vien|bang xep hang|vleague|v-league)\b/.test(text)) return 'OFFICIAL_SEARCH';
  if (/\b(tin moi|tin tuc moi|tin gan day|tin moi nhat)\b/.test(text)) return 'LATEST_NEWS';
  if (/\b(tin tuc)\b/.test(text)) return 'OFFICIAL_SEARCH';
  if (/\b(cau thu|doi hinh|danh sach.*(clb|slna|song lam)|thu mon|hau ve|tien ve|tien dao)\b/.test(text)
      || (isFollowUp(text) && /\b(cau thu|doi hinh|thu mon|hau ve|tien ve|tien dao)\b/.test(historyText))) return 'SQUAD';
  if (/\b(ket qua|ti so|ty so|tran.*da dau|slna.*(thang|thua|hoa))\b/.test(text)) return hasSelectedMatch ? 'SPECIFIC_MATCH' : 'RESULTS';
  if (/\b(lich thi dau|tran sap|sap toi|khi nao thi dau|doi nao|may gio da)\b/.test(text)) return hasSelectedMatch ? 'SPECIFIC_MATCH' : 'SCHEDULE';
  if (/\b(san van dong|san vinh|dia chi (san|clb)|den san)\b/.test(text)) return 'STADIUM';
  if (hasSelectedMatch && (/\b(tran|gap|vs|thong tin)\b/.test(text) || isFollowUp(text))) return 'SPECIFIC_MATCH';
  if (isFollowUp(text) && /\b(gia ve|khan dai)\b/.test(historyText)) return 'TICKET_PRICE';
  return 'GENERAL';
};

const selectMatch = (matches, question) => {
  const text = normalize(question);
  const candidates = matches.filter((match) => {
    const opponent = normalize(match.opponent).trim();
    return opponent && (` ${text.replace(/[^a-z0-9 ]/g, ' ')} `).includes(` ${opponent} `);
  });
  if (!candidates.length) return null;
  // An explicitly named opponent may have multiple fixtures: don't silently choose the newest year.
  const years = question.match(/\b20\d{2}\b/g) || [];
  const filtered = years.length ? candidates.filter((m) => years.includes(String(new Date(m.match_date).getFullYear()))) : candidates;
  if (/\b(ket qua|ti so|ty so|da dau|vua roi)\b/.test(text)) {
    return filtered.filter((m) => m.status === 'FINISHED').sort((a, b) => new Date(b.match_date) - new Date(a.match_date))[0] || null;
  }
  return filtered.filter((m) => m.status !== 'FINISHED' && new Date(m.match_date) >= new Date())
    .sort((a, b) => new Date(a.match_date) - new Date(b.match_date))[0] || (filtered.length === 1 ? filtered[0] : null);
};

module.exports = { normalize, isFollowUp, classifyQuestion, selectMatch };
