import { NextResponse } from 'next/server';
import { canAccessVenue, getAuthenticatedActor, getSupabaseAdminClient } from '@/server/auth';

export const dynamic = 'force-dynamic';

const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
const BUCKET_NAME = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'qr-menu';
const ALLOWED_FOLDERS = new Set([
  'qr-menu-settings',
  'qr-menu/venues',
  'qr-menu/venues/logos',
  'qr-menu/campaigns',
  'qr-menu/products',
  'qr-menu/categories',
  'qr-menu/categories/covers',
]);
const SUPER_ADMIN_ONLY_FOLDERS = new Set(['qr-menu-settings']);

function sanitizeFileName(name: string) {
  const baseName = name.split('.').slice(0, -1).join('.') || name;
  return baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'image';
}

export async function POST(req: Request) {
  try {
    const actor = await getAuthenticatedActor(req);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['SUPER_ADMIN', 'VENUE_MANAGER'].includes(actor.profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const requestedFolder = formData.get('folder');
    const venueIdEntry = formData.get('venueId');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const folder = typeof requestedFolder === 'string' ? requestedFolder : 'qr-menu/products';
    const venueId = typeof venueIdEntry === 'string' && venueIdEntry.trim().length > 0
      ? venueIdEntry.trim()
      : null;

    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: 'Invalid upload target' }, { status: 400 });
    }

    if (!file.type || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are allowed' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json({ error: 'File exceeds 20 MB limit' }, { status: 400 });
    }

    if (SUPER_ADMIN_ONLY_FOLDERS.has(folder) && actor.profile.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (actor.profile.role === 'VENUE_MANAGER') {
      if (!venueId) {
        return NextResponse.json({ error: 'Venue context is required' }, { status: 400 });
      }

      if (!canAccessVenue(actor, venueId)) {
        return NextResponse.json({ error: 'You do not have access to this venue' }, { status: 403 });
      }
    }

    const supabase = getSupabaseAdminClient();
    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(BUCKET_NAME);
    if (bucketError || !bucketData) {
      console.error('Supabase bucket lookup failed:', bucketError);
      return NextResponse.json({ error: 'Storage is not configured' }, { status: 500 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeName = sanitizeFileName(file.name);
    const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : undefined;
    const objectPathBase = venueId ? `${folder}/${venueId}` : folder;
    const objectPath = `${objectPathBase}/${safeName}-${crypto.randomUUID()}${extension ? `.${extension}` : ''}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(objectPath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path);

    return NextResponse.json({ secure_url: publicUrlData.publicUrl, path: uploadData.path });
  } catch (error) {
    console.error('Error in /api/upload-supabase:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
