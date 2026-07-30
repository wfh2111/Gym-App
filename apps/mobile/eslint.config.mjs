import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

// eslint-config-expo@8 only ships a legacy eslintrc-style config (no flat export yet), so bridge
// it into flat config via FlatCompat rather than hand-rolling the RN/Expo plugin set ourselves.
const compat = new FlatCompat({ baseDirectory: path.dirname(fileURLToPath(import.meta.url)) });

export default [
  ...compat.extends('expo'),
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    rules: {
      'react/react-in-jsx-scope': 'off',
    },
  },
];
