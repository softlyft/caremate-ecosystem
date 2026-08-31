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
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { FormActions, FormField, FormStack } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
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
  const [pendingAction, setPendingAction] = useState<'save' | 'delete' | null>(null);
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
      setPendingAction('save');
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
      } finally {
        setPendingAction(null);
      }
    });
  });

  const onDelete = () => {
    if (!article || !confirm('Delete this learn item?')) return;
    start(async () => {
      setPendingAction('delete');
      try {
        await deleteArticle(article.id);
        toast.success('Deleted');
        router.push('/dashboard/learn');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Delete failed');
      } finally {
        setPendingAction(null);
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
        <form onSubmit={onSubmit}>
          <FormStack>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Title" htmlFor="title" className="md:col-span-2" error={errors.title?.message}>
                <Input id="title" {...register('title')} />
              </FormField>
              <FormField label="Content type" htmlFor="content_type">
                <Select id="content_type" {...register('content_type')}>
                  {LEARN_CONTENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {LEARN_CONTENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Category" htmlFor="category_id">
                <Select id="category_id" {...register('category_id')}>
                  <option value="">—</option>
                  {HEALTH_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Summary" htmlFor="summary" className="md:col-span-2">
                <Textarea id="summary" rows={2} {...register('summary')} />
              </FormField>
              <FormField label="Content" htmlFor="content" className="md:col-span-2">
                <Textarea id="content" rows={10} {...register('content')} />
              </FormField>
              <FormField label="Published at (empty = draft)" htmlFor="published_at">
                <Input id="published_at" type="datetime-local" {...register('published_at')} />
              </FormField>
              <FormField label="Source URL" htmlFor="source_url">
                <Input id="source_url" {...register('source_url')} />
              </FormField>
              <FormField label="Image URL" htmlFor="image_url" className="md:col-span-2">
                <div className="flex gap-2">
                  <Input id="image_url" {...register('image_url')} />
                  <FileUploadButton
                    accept="image/*"
                    loading={uploading}
                    onFile={(file) => void onUpload(file)}
                  />
                </div>
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="mt-2 h-24 rounded-md object-cover" />
                ) : null}
              </FormField>
              <FormField label="Attributes (JSON)" htmlFor="attributes_json" className="md:col-span-2">
                <Textarea
                  id="attributes_json"
                  rows={5}
                  className="font-mono text-xs"
                  {...register('attributes_json')}
                />
              </FormField>
            </div>
            <FormActions className="justify-start">
              <Button
                type="submit"
                disabled={pending}
                loading={pendingAction === 'save'}
                loadingLabel="Saving…"
              >
                Save
              </Button>
              {article ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={pending}
                  loading={pendingAction === 'delete'}
                  loadingLabel="Deleting…"
                  onClick={onDelete}
                >
                  Delete
                </Button>
              ) : null}
            </FormActions>
          </FormStack>
        </form>
      </CardContent>
    </Card>
  );
}
