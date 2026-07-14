'use client';

import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { saveArticle, deleteArticle } from '@/domains/articles/actions';
import { uploadLearnMedia } from '@/domains/media/actions';
import { LEARN_CONTENT_TYPES, LEARN_CONTENT_TYPE_LABELS } from '@/constants/content';
import { HEALTH_CATEGORIES } from '@/constants/categories';
import type { Article } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  summary: z.string().optional(),
  content: z.string().optional(),
  content_type: z.string(),
  category_id: z.string().optional(),
  image_url: z.string().optional(),
  source_url: z.string().optional(),
  published_at: z.string().optional(),
  attributes_json: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ArticleForm({ article }: { article?: Article }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: article?.title ?? '',
      summary: article?.summary ?? '',
      content: article?.content ?? '',
      content_type: article?.content_type ?? 'article',
      category_id: article?.category_id ?? '',
      image_url: article?.image_url ?? '',
      source_url: article?.source_url ?? '',
      published_at: article?.published_at
        ? article.published_at.slice(0, 16)
        : '',
      attributes_json: JSON.stringify(article?.attributes ?? {}, null, 2),
    },
  });

  const imageUrl = useWatch({ control, name: 'image_url' });

  const onSubmit = handleSubmit((values) => {
    start(async () => {
      try {
        let attributes = {};
        if (values.attributes_json?.trim()) {
          attributes = JSON.parse(values.attributes_json);
        }
        const id = await saveArticle({
          id: article?.id,
          title: values.title,
          summary: values.summary || null,
          content: values.content || null,
          content_type: values.content_type,
          category_id: values.category_id || null,
          image_url: values.image_url || null,
          source_url: values.source_url || null,
          published_at: values.published_at
            ? new Date(values.published_at).toISOString()
            : null,
          attributes,
        });
        toast.success(article ? 'Article updated' : 'Article created');
        router.push(`/dashboard/learn/${id}`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Save failed');
      }
    });
  });

  const onDelete = () => {
    if (!article || !confirm('Delete this learn item?')) return;
    start(async () => {
      try {
        await deleteArticle(article.id);
        toast.success('Deleted');
        router.push('/dashboard/learn');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Delete failed');
      }
    });
  };

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const url = await uploadLearnMedia(fd);
      setValue('image_url', url);
      toast.success('Image uploaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register('title')} />
              {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="content_type">Content type</Label>
              <Select id="content_type" {...register('content_type')}>
                {LEARN_CONTENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {LEARN_CONTENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category_id">Category</Label>
              <Select id="category_id" {...register('category_id')}>
                <option value="">—</option>
                {HEALTH_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea id="summary" rows={2} {...register('summary')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="content">Content</Label>
              <Textarea id="content" rows={10} {...register('content')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="published_at">Published at (empty = draft)</Label>
              <Input id="published_at" type="datetime-local" {...register('published_at')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source_url">Source URL</Label>
              <Input id="source_url" {...register('source_url')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="image_url">Image URL</Label>
              <div className="flex gap-2">
                <Input id="image_url" {...register('image_url')} />
                <label className="inline-flex h-10 shrink-0 cursor-pointer items-center rounded-md border border-border bg-surface px-3 text-sm hover:bg-gray-100">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onUpload(f);
                    }}
                  />
                  {uploading ? 'Uploading…' : 'Upload'}
                </label>
              </div>
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="mt-2 h-24 rounded-md object-cover" />
              ) : null}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="attributes_json">Attributes (JSON)</Label>
              <Textarea
                id="attributes_json"
                rows={5}
                className="font-mono text-xs"
                {...register('attributes_json')}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
            {article ? (
              <Button type="button" variant="danger" disabled={pending} onClick={onDelete}>
                Delete
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
