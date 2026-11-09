// Cloudflare Worker — принимает запрос со страницы и отправляет сообщение
// от имени сообщества ВК получателю (VK_RECIPIENT), используя секретный токен сообщества.
// Токен и ID сообщества НИКОГДА не хранятся в этом файле — только в секретах Cloudflare
// (Settings → Variables), см. VK-УВЕДОМЛЕНИЯ-ИНСТРУКЦИЯ.md.

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'method not allowed' }), {
        status: 405,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'bad request' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    let message;

    if (body.type === 'visit') {
      const timestamp = String(body.timestamp || '').slice(0, 100);
      const device = String(body.device || '').slice(0, 100);
      if (!timestamp) {
        return new Response(JSON.stringify({ ok: false, error: 'missing fields' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      message = `🕒 Принцесса открыла сайт\nВремя: ${timestamp}`;
      if (device) message += `\nУстройство: ${device}`;
    } else {
      const date = String(body.date || '').slice(0, 200);
      const address = String(body.address || '').slice(0, 300);

      if (!date || !address) {
        return new Response(JSON.stringify({ ok: false, error: 'missing fields' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      message = `Принцесса согласна на цветы! 💐\nДата: ${date}\nАдрес: ${address}`;
    }

    const params = new URLSearchParams({
      access_token: env.VK_TOKEN,
      group_id: env.VK_GROUP_ID,
      domain: env.VK_RECIPIENT,
      random_id: String(Date.now()),
      message,
      v: '5.199',
    });

    let vkData;
    try {
      const vkResponse = await fetch(`https://api.vk.com/method/messages.send?${params.toString()}`, {
        method: 'POST',
      });
      vkData = await vkResponse.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'vk request failed' }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (vkData.error) {
      return new Response(JSON.stringify({ ok: false, error: vkData.error.error_msg }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
