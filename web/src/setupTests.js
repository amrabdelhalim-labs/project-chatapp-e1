// Polyfill TextEncoder/TextDecoder for jsdom (required by react-router v7)
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import "@testing-library/jest-dom";
