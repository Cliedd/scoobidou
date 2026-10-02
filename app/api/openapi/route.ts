import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ openapi: '3.0.3', info: { title: 'Passportly API', version: '0.1.0', description: 'Visa requirements with source and verification metadata.' }, paths: {
    '/api/visa': { get: { parameters: [{ name: 'passport', in: 'query', required: true, schema: { type: 'string', example: 'CM' } }, { name: 'destination', in: 'query', schema: { type: 'string', example: 'FR' } }], responses: { '200': { description: 'Visa rules' } } } },
    '/api/compare': { get: { parameters: [{ name: 'left', in: 'query', required: true, schema: { type: 'string' } }, { name: 'right', in: 'query', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Passport comparison' } } } },
    '/api/schengen': { post: { requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: '90/180 calculation' } } } }
  } });
}
