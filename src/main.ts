import { register } from "jsr:@kt3k/cell";

function Hello() {
  return "hello, world!";
}

register(Hello, "hello");
