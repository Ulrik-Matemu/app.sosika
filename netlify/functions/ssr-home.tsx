import { Handler } from '@netlify/functions';
import { renderToString } from 'react-dom/server';
import Home from '../../src/pages/home';
import fs from 'fs';
import path from 'path';

const handler: Handler = async () => {
  const html = renderToString(<Home />);

  const template = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf-8');
  const fullHtml = template.replace('<!--app-html-->', html);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
    },
    body: fullHtml,
  };
};

export { handler };
