import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSupabaseUrl } from '@/utils/supabase/config';
import { createClient as createServerClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authClient = await createServerClient();
    const { data: { session } } = await authClient.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'qr-menu';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const supabaseUrl = getServerSupabaseUrl();
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'qr-menu';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase URL or SUPABASE_SERVICE_ROLE_KEY missing' }, 
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucketName);
    if (bucketError && !bucketError.message.toLowerCase().includes('not found')) {
      return NextResponse.json({ error: bucketError.message }, { status: 500 });
    }

    if (!bucketData) {
      const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
        public: true
      });

      if (createBucketError && !createBucketError.message.toLowerCase().includes('already exists')) {
        return NextResponse.json({ error: createBucketError.message }, { status: 500 });
      }
    } else if (!bucketData.public) {
      await supabase.storage.updateBucket(bucketName, { public: true });
    }

    // Generate safe filename from binary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const safeName = file.name
      .split('.')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50) || 'image';
      
    const extension = file.name.split('.').pop() || 'png';
    const fileName = `${folder}/${safeName}-${Math.random().toString(36).substring(2, 8)}.${extension}`;

    // Upload using Supabase Service Role Key to bypass public insert limitations
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Public URL retrieval
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uploadData.path);

    return NextResponse.json({ secure_url: publicUrlData.publicUrl });
  } catch (error: any) {
    console.error('Error in /api/upload-supabase:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
