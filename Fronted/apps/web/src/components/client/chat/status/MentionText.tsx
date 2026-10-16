'use client';

import { useSyncExternalStore } from 'react';
import { readLoadedContacts, subscribeLoadedContacts } from '@/lib/client/contactStore';

interface Segment {
  text: string;
  isMention: boolean;
}

/** Parte el contenido en tramos normales y menciones a contactos conocidos */
export const splitMentions = (content: string): Segment[] => {
  const names = readLoadedContacts().map((contact) => contact.name).sort((left, right) => right.length - left.length);
  const segments: Segment[] = [];
  let plain = '';

  for (let i = 0; i < content.length; ) {
    const name = content[i] === '@' ? names.find((item) => content.startsWith(item, i + 1)) : undefined;

    if (!name) {
      plain += content[i];
      i += 1;
      continue;
    }

    if (plain) segments.push({ text: plain, isMention: false });
    plain = '';
    segments.push({ text: `@${name}`, isMention: true });
    i += name.length + 1;
  }

  if (plain) segments.push({ text: plain, isMention: false });
  return segments;
};

/** Texto del estado con las menciones a contactos pintadas en morado */
export default function MentionText({ content }: { content: string }) {
  useSyncExternalStore(subscribeLoadedContacts, readLoadedContacts, () => []);
  return (
    <>
      {splitMentions(content).map((segment, index) =>
        segment.isMention ? (
          <span key={index} className="text-brand-primary">
            {segment.text}
          </span>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  );
}
