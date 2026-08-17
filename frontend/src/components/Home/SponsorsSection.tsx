'use client';

import { useEffect, useState } from 'react';
import axiosClient, { API_ORIGIN } from '../../api/axiosClient';
import { ISponsor, SponsorLevel } from '../../interfaces/ISponsor';

const levels: Array<{ key: SponsorLevel; label: string }> = [
  { key: 'DIAMOND', label: 'Nhà tài trợ kim cương' },
  { key: 'GOLD', label: 'Nhà tài trợ vàng' },
  { key: 'SILVER', label: 'Nhà tài trợ bạc' },
  { key: 'PARTNER', label: 'Đối tác đồng hành' },
];

const resolveLogoUrl = (url: string) => url.startsWith('http') ? url : `${API_ORIGIN}${url}`;

export default function SponsorsSection() {
  const [sponsors, setSponsors] = useState<ISponsor[]>([]);

  useEffect(() => {
    void axiosClient.get<ISponsor[]>('/sponsors')
      .then(setSponsors)
      .catch(() => setSponsors([]));
  }, []);

  if (sponsors.length === 0) return null;

  return (
    <section className="border-y border-gray-100 bg-white py-16">
      <div className="mx-auto max-w-7xl space-y-12 px-6">
        {levels.map(({ key, label }) => {
          const items = sponsors.filter((sponsor) => sponsor.level === key);
          if (items.length === 0) return null;

          return (
            <div key={key}>
              <h2 className="bg-[#303f98] px-4 py-3 text-center text-xl font-medium uppercase text-white md:text-2xl">
                {label}
              </h2>
              <div className="grid grid-cols-2 items-center gap-x-10 gap-y-12 px-4 py-12 md:grid-cols-3 lg:grid-cols-4">
                {items.map((sponsor) => {
                  const logo = (
                    // Sponsor logos can come from the local upload API or an admin-provided URL.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveLogoUrl(sponsor.logoUrl)}
                      alt={sponsor.name}
                      className="max-h-28 w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  );

                  return sponsor.websiteUrl ? (
                    <a
                      key={sponsor.id}
                      href={sponsor.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Truy cập website ${sponsor.name}`}
                      className="group flex min-h-28 items-center justify-center"
                    >
                      {logo}
                    </a>
                  ) : (
                    <div key={sponsor.id} className="group flex min-h-28 items-center justify-center">
                      {logo}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
