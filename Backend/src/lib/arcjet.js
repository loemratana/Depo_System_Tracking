import arcjet, { shield } from "@arcjet/node";

const aj = arcjet({
  key: process.env.ARCJET_KEY, // ✅ correct key
  rules: [
    shield({
      mode: "DRY_RUN", // or "LIVE" in production
    }),
  ],
});

export default aj;
