import { handleApi } from '../_handler';
import { countries } from '../../../../lib/api-keys/data';
export async function GET(request: Request) { return handleApi(request, '/v1/countries', async () => countries()); }
