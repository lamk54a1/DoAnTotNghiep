'use client';

import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { IMatch, ITicket } from '../interfaces';

export interface StandInventory {
  total: number;
  sold: number;
  paperReserved: number;
  paperSold: number;
  available: number;
}

const createEmptyStandInventory = (): Record<string, StandInventory> => ({
  A: { total: 0, sold: 0, paperReserved: 0, paperSold: 0, available: 0 },
  B: { total: 0, sold: 0, paperReserved: 0, paperSold: 0, available: 0 },
  C: { total: 0, sold: 0, paperReserved: 0, paperSold: 0, available: 0 },
  D: { total: 0, sold: 0, paperReserved: 0, paperSold: 0, available: 0 },
});

export function useBookingMatch(matchId?: string) {
  const [localSoldSeats, setLocalSoldSeats] = useState<string[]>([]);
  const [existingSeats, setExistingSeats] = useState<string[]>([]);
  const [ticketPrices, setTicketPrices] = useState<Record<string, number>>({});
  const [match, setMatch] = useState<IMatch | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(true);
  const [purchasedTicketCount, setPurchasedTicketCount] = useState(0);
  const [standInventory, setStandInventory] = useState<Record<string, StandInventory>>(createEmptyStandInventory);
  const [heldSeats, setHeldSeats] = useState<string[]>([]);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);

  const fetchSoldSeats = useCallback(async () => {
    if (!matchId) {
      setLoadingMatch(false);
      return;
    }

    try {
      const matchData = await axiosClient.get<IMatch>(`/matches/${matchId}`);
      setMatch(matchData);
      if (matchData.status !== 'ON_SALE') return;

      const ticketsData = await axiosClient.get<ITicket[]>(`/tickets/${matchId}`);
      const tickets = ticketsData;
      setExistingSeats(tickets.map((ticket) => ticket.seatCode));
      setTicketPrices(Object.fromEntries(tickets.map((ticket) => [ticket.seatCode, Number(ticket.price || 0)])));
      const myHeldTickets = tickets.filter((ticket) => ticket.status === 'HELD' && ticket.heldByCurrentUser);
      setHeldSeats(myHeldTickets.map((ticket) => ticket.seatCode));
      setHoldExpiresAt(myHeldTickets
        .map((ticket) => ticket.heldUntil ? new Date(ticket.heldUntil).getTime() : 0)
        .filter(Boolean)
        .sort((a, b) => a - b)[0]?.toString() || null);
      setLocalSoldSeats(tickets
        .filter((ticket) => ticket.status !== 'AVAILABLE' && !ticket.heldByCurrentUser)
        .map((ticket) => ticket.seatCode));
      setStandInventory(tickets.reduce<Record<string, StandInventory>>((acc, ticket) => {
        const stand = ticket.seatCode.charAt(0);
        if (!acc[stand]) acc[stand] = { total: 0, sold: 0, paperReserved: 0, paperSold: 0, available: 0 };
        acc[stand].total += 1;
        if (ticket.status === 'SOLD') {
          acc[stand].sold += 1;
        } else if (ticket.status === 'PAPER_RESERVED') {
          acc[stand].paperReserved += 1;
        } else if (ticket.status === 'PAPER_SOLD') {
          acc[stand].paperSold += 1;
        } else if (ticket.status === 'AVAILABLE') {
          acc[stand].available += 1;
        }
        return acc;
      }, createEmptyStandInventory()));

      const storedUser = localStorage.getItem('user_info');
      if (storedUser) {
        try {
          const countData = await axiosClient.get<{ ticketCount: number }>(`/orders/match/${matchId}/count`);
          setPurchasedTicketCount(Number(countData.ticketCount || 0));
        } catch (countError) {
          console.error('Lỗi khi kiểm tra giới hạn vé đã mua:', countError);
          setPurchasedTicketCount(0);
        }
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách ghế đã bán:', error);
    } finally {
      setLoadingMatch(false);
    }
  }, [matchId]);

  useEffect(() => {
    void Promise.resolve().then(fetchSoldSeats);
    const interval = window.setInterval(fetchSoldSeats, 5000);
    return () => window.clearInterval(interval);
  }, [fetchSoldSeats]);

  return {
    existingSeats,
    loadingMatch,
    localSoldSeats,
    match,
    purchasedTicketCount,
    standInventory,
    ticketPrices,
    heldSeats,
    holdExpiresAt,
    refreshSeats: fetchSoldSeats,
  };
}
