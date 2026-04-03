import { elysia } from '../../../../server/elysia'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const url = new URL(request.url)
  url.pathname = `/api/conversations/${params.id}`
  return elysia.fetch(new Request(url.toString(), { method: 'GET', headers: request.headers }))
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const url = new URL(request.url)
  url.pathname = `/api/conversations/${params.id}`
  const newReq = new Request(url.toString(), { method: 'DELETE', headers: request.headers })
  return elysia.fetch(newReq)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const url = new URL(request.url)
  url.pathname = `/api/conversations/${params.id}`
  const body = await request.text()
  return elysia.fetch(new Request(url.toString(), { method: 'PATCH', headers: request.headers, body }))
}
