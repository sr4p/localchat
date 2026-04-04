import { elysia } from '../../../../server/elysia'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const url = new URL(request.url)
  url.pathname = `/api/conversations/${id}`
  return elysia.fetch(new Request(url.toString(), { method: 'GET', headers: request.headers }))
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const url = new URL(request.url)
  url.pathname = `/api/conversations/${id}`
  return elysia.fetch(new Request(url.toString(), { method: 'DELETE', headers: request.headers }))
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const url = new URL(request.url)
  url.pathname = `/api/conversations/${id}`
  const body = await request.text()
  return elysia.fetch(new Request(url.toString(), { method: 'PATCH', headers: request.headers, body }))
}
