import { Text, TextStyle, StyleProp } from 'react-native';
import { colors } from '@beeapp/design-system';
import { MY_CONTACTS } from '../../../mocks/contacts';

/** Nombres largos primero, para que "@Ana María" gane sobre "@Ana" */
const NAMES = MY_CONTACTS.map((contact) => contact.name).sort((a, b) => b.length - a.length);

interface Segment {
  text: string;
  isMention: boolean;
}

/** Parte el contenido en tramos normales y menciones a contactos conocidos */
export const splitMentions = (content: string): Segment[] => {
  const segments: Segment[] = [];
  let plain = '';

  for (let i = 0; i < content.length; ) {
    const name = content[i] === '@' ? NAMES.find((n) => content.startsWith(n, i + 1)) : undefined;

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

interface MentionTextProps {
  content: string;
  style?: StyleProp<TextStyle>;
}

/** Texto del estado con las menciones a contactos pintadas en morado */
export default function MentionText({ content, style }: MentionTextProps) {
  return (
    <Text style={style}>
      {splitMentions(content).map((segment, index) => (
        <Text
          key={index}
          style={segment.isMention ? { color: colors.brand.primary } : undefined}
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}
