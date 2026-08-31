import {
  TextDecoder,
  TextEncoder,
} from 'text-encoding';

type GlobalWithTextEncoding = typeof globalThis & {
  TextDecoder?: typeof TextDecoder;
  TextEncoder?: typeof TextEncoder;
};

const runtime = globalThis as GlobalWithTextEncoding;

if (!runtime.TextEncoder) {
  runtime.TextEncoder = TextEncoder;
}

if (!runtime.TextDecoder) {
  runtime.TextDecoder = TextDecoder;
}
