const waitForNextPaint = () => new Promise<void>((resolve) => {
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
});

const waitForImage = async (image: HTMLImageElement) => {
  if (!image.complete) {
    await new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    });
  }

  if (typeof image.decode === 'function') {
    await image.decode().catch(() => undefined);
  }
};

export const printDocumentWhenReady = async (containerSelector: string) => {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  await document.fonts?.ready;
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.race([
    Promise.all(images.map(waitForImage)),
    new Promise<void>((resolve) => window.setTimeout(resolve, 3000)),
  ]);
  await waitForNextPaint();
  window.print();
};
