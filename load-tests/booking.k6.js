import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export const options = {
  scenarios: {
    hot_seat: {
      executor: 'constant-vus',
      vus: 40,
      duration: '20s',
      exec: 'hotSeat',
    },
    spread: {
      executor: 'constant-arrival-rate',
      rate: 150,
      timeUnit: '1s',
      duration: '20s',
      preAllocatedVUs: 40,
      maxVUs: 200,
      exec: 'spread',
      startTime: '2s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95'],
  },
};

export function setup() {
  const response = http.get(`${baseUrl}/dev/fixture`);
  const body = response.json();
  if (!body || !body.eventId || !body.seatIds || body.seatIds.length === 0) {
    throw new Error('데모 좌석을 가져오지 못했습니다. 게이트웨이의 SEED_ON_BOOT을 확인하세요.');
  }
  return body;
}

export function hotSeat(data) {
  postBooking(data.eventId, data.seatIds[0]);
}

export function spread(data) {
  const seatId = data.seatIds[Math.floor(Math.random() * data.seatIds.length)];
  postBooking(data.eventId, seatId);
}

function postBooking(eventId, seatId) {
  const response = http.post(
    `${baseUrl}/bookings`,
    JSON.stringify({
      eventId,
      seatId,
      userId: uuidv4(),
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': uuidv4(),
      },
    },
  );

  check(response, {
    '버퍼 접수': (res) => res.status === 202,
  });
  sleep(0.05);
}
