import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="theme-color" content="#0f172a" />
        <link rel="icon" href="/favicon.ico" />
        {/* Moyasar Payment Gateway Stylesheet & SDK */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.10/dist/moyasar.css" />
        <script src="https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.10/dist/moyasar.umd.min.js"></script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
