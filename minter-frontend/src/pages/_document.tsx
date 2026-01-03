import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="description" content="Create your own Jetton 2.0 token on TON Blockchain" />
        <meta name="theme-color" content="#0088CC" />
        <meta property="og:title" content="Jetton 2.0 Minter" />
        <meta property="og:description" content="Create your own Jetton 2.0 token on TON Blockchain" />
        <meta property="og:type" content="website" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
