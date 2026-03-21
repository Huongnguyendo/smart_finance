# RabbitMQ Setup

## Local: Docker

1. `docker-compose up -d`
2. **RabbitMQ Management UI:** http://localhost:15672 (guest/guest)
   - View queues, connections, messages
   - No signup required

## Cloud: CloudAMQP (free, no credit card)

1. Sign up at [cloudamqp.com](https://cloudamqp.com)
2. Create instance → **Little Lemur** (free)
3. Copy **AMQP URL** (e.g. `amqps://user:pass@host/vhost`)
4. Add to `.env`:
   ```bash
   RABBITMQ_URI=amqps://your-user:your-pass@your-host.cloudamqp.com/your-vhost
   ```
5. Restart backend

## Local vs Cloud

| | Local (Docker) | CloudAMQP |
|---|----------------|-----------|
| RABBITMQ_URI | (leave unset) | amqps://... from dashboard |
| Fallback | host=localhost, guest/guest | — |
| Dashboard | localhost:15672 | CloudAMQP dashboard |

When RABBITMQ_URI is set, the app uses it. Otherwise it uses localhost with guest/guest.
