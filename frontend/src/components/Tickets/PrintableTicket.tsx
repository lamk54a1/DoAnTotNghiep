'use client';

import dayjs from 'dayjs';
import { QRCode } from 'antd';
import { API_ORIGIN } from '../../api/axiosClient';
import { ISponsor } from '../../interfaces/ISponsor';

export interface PrintableTicketData {
  id: number;
  seatCode: string;
  sector?: string;
  seatNumber?: number;
  price?: number;
  ticketQrCode?: string;
  opponent?: string;
  matchDate?: string;
  stadium?: string;
  competitionName?: string;
}

interface PrintableTicketProps {
  ticket: PrintableTicketData;
  fallbackQrCode: string;
  sponsors: ISponsor[];
}

const resolveImage = (url: string) => url.startsWith('http') ? url : `${API_ORIGIN}${url}`;

export default function PrintableTicket({ ticket, fallbackQrCode, sponsors }: PrintableTicketProps) {
  const matchDate = ticket.matchDate ? dayjs(ticket.matchDate) : null;
  const stand = ticket.sector?.charAt(0) || ticket.seatCode.charAt(0);

  return (
    <article className="slna-print-ticket mx-auto w-[390px] overflow-hidden rounded-[28px] border border-gray-200 bg-white text-[#111827] shadow-2xl">
      <div className="h-3 bg-[#edbb00]" />
      <div className="px-7 pb-7 pt-6">
        <header className="flex items-start gap-4 border-b border-gray-200 pb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="Logo SLNA" className="h-20 w-20 shrink-0 object-contain" />
          <div className="pt-1">
            <h1 className="m-0 text-[14px] font-black uppercase leading-5 text-[#003078]">
              Công ty Cổ phần Thể thao<br />Sông Lam Nghệ An
            </h1>
            <p className="mb-0 mt-2 text-[9px] font-bold leading-4 text-gray-600">MST: 2902103060</p>
            <p className="m-0 text-[9px] leading-4 text-gray-500">
              Số 6 đường Đào Tấn, Phường Thành Vinh,<br />Tỉnh Nghệ An, Việt Nam.
            </p>
          </div>
        </header>

        <section className="py-5 text-center">
          <p className="m-0 text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
            {ticket.competitionName || 'V-League'}
          </p>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <strong className="text-right text-lg font-black uppercase text-[#003078]">SLNA</strong>
            <span className="rounded-full bg-[#edbb00] px-3 py-1 text-xs font-black text-[#003078]">VS</span>
            <strong className="text-left text-lg font-black uppercase text-[#003078]">{ticket.opponent || 'Đội khách'}</strong>
          </div>
        </section>

        <section className="border-2 border-[#003078]">
          <div className="grid grid-cols-3 border-b border-[#003078] text-center">
            <div className="p-3">
              <span className="block text-[8px] font-bold uppercase text-gray-400">Ngày</span>
              <strong className="text-sm">{matchDate?.format('DD/MM/YYYY') || '-'}</strong>
            </div>
            <div className="border-x border-[#003078] p-3">
              <span className="block text-[8px] font-bold uppercase text-gray-400">Giờ</span>
              <strong className="text-2xl text-[#003078]">{matchDate?.format('HH:mm') || '-'}</strong>
            </div>
            <div className="p-3">
              <span className="block text-[8px] font-bold uppercase text-gray-400">Giá vé</span>
              <strong className="text-sm">{Number(ticket.price || 0).toLocaleString('vi-VN')}đ</strong>
            </div>
          </div>
          <div className="p-3 text-center text-xs font-black uppercase text-gray-700">
            {ticket.stadium || 'Sân vận động Vinh'}
          </div>
        </section>

        <section className="mt-2 grid grid-cols-[74px_1fr_74px] items-center border-2 border-[#003078] px-3 py-5">
          <div className="text-center">
            <span className="block text-[9px] font-bold uppercase text-gray-400">Khán đài</span>
            <strong className="text-3xl text-[#003078]">{stand}</strong>
          </div>
          <div className="text-center">
            <QRCode value={ticket.ticketQrCode || fallbackQrCode} size={170} color="#111827" bordered={false} />
            <p className="m-0 break-all text-[8px] font-bold text-gray-400">{ticket.ticketQrCode || fallbackQrCode}</p>
          </div>
          <div className="text-center">
            <span className="block text-[9px] font-bold uppercase text-gray-400">Ghế</span>
            <strong className="text-xl text-[#003078]">{ticket.seatCode}</strong>
          </div>
        </section>

        {sponsors.length > 0 && (
          <section className="mt-6">
            <p className="mb-4 text-center text-[8px] font-black uppercase tracking-[0.25em] text-gray-400">
              Nhà tài trợ đồng hành
            </p>
            <div className="grid grid-cols-4 items-center gap-4">
              {sponsors.slice(0, 12).map((sponsor) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={sponsor.id}
                  src={resolveImage(sponsor.logoUrl)}
                  alt={sponsor.name}
                  className="max-h-10 w-full object-contain"
                />
              ))}
            </div>
          </section>
        )}

        <footer className="mt-6 border-t border-gray-200 pt-4 text-center">
          <p className="m-0 text-[9px] font-black uppercase leading-4 text-red-600">
            Lưu ý: Các cửa sẽ đóng đón khán giả<br />sau 15 phút kể từ khi trận đấu bắt đầu
          </p>
          <p className="mb-0 mt-3 text-[8px] leading-4 text-gray-400">
            Vé chỉ có giá trị một lần quét. Không chia sẻ mã QR cho người khác.
          </p>
        </footer>
      </div>
      <div className="h-3 bg-[#003078]" />
    </article>
  );
}
