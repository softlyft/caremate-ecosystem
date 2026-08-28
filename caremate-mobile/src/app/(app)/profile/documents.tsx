import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FilePlus2, FileText, Link2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import {
  Button,
  ChoiceChip,
  FormActions,
  FormField,
  FormNotice,
  FormStack,
  Input,
} from '@/components/ui/form-controls';

import { PdfDocumentPreview } from '@/components/documents/PdfDocumentPreview';
import { AppText } from '@/components/ui/AppText';
import { ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import {
  PROVIDER_DOCUMENT_TYPES,
  providerDocumentsService,
  type ProviderDocument,
  type ProviderDocumentType,
} from '@/domains/providers/documents-service';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

type DocumentPreview = {
  uri: string;
  remoteUrl: string;
  title: string;
  mimeType: string | null;
  fileName: string | null;
};

function typeLabel(
  t: (key: string, params?: Record<string, string | number>) => string,
  documentType: ProviderDocumentType,
): string {
  return t(`profile.documents.types.${documentType}`);
}

function isImagePreview(mimeType: string | null, fileName: string | null): boolean {
  if (mimeType?.startsWith('image/')) {
    return true;
  }
  const lower = fileName?.toLowerCase() ?? '';
  return ['.jpg', '.jpeg', '.png', '.webp'].some((ext) => lower.endsWith(ext));
}

function isPdfPreview(mimeType: string | null, fileName: string | null): boolean {
  if (mimeType === 'application/pdf') {
    return true;
  }
  return Boolean(fileName?.toLowerCase().endsWith('.pdf'));
}

function canPreviewInApp(mimeType: string | null, fileName: string | null): boolean {
  return isImagePreview(mimeType, fileName) || isPdfPreview(mimeType, fileName);
}

export default function ProviderDocumentsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isGuest = useIsGuest();
  const queryClient = useQueryClient();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [linkDoc, setLinkDoc] = useState<ProviderDocument | null>(null);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState<ProviderDocumentType>('prescription');
  const [uploadOrgId, setUploadOrgId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: QUERY_KEYS.providerDocuments,
    queryFn: () => providerDocumentsService.listMine(),
    enabled: !isGuest,
  });

  const orgsQuery = useQuery({
    queryKey: [...QUERY_KEYS.providerDocuments, 'linkable-orgs'],
    queryFn: () => providerDocumentsService.listLinkableOrganizations(),
    enabled: !isGuest && (uploadOpen || Boolean(linkDoc)),
  });

  const orgs = orgsQuery.data ?? [];

  const openMutation = useMutation({
    mutationFn: (doc: ProviderDocument) => providerDocumentsService.prepareLocalPreview(doc),
    onMutate: (doc) => {
      setOpeningId(doc.id);
    },
    onSuccess: (local) => {
      setPreviewError(null);
      setPreview(local);
      setPreviewLoading(canPreviewInApp(local.mimeType, local.fileName));
    },
    onError: (error) => {
      Alert.alert(
        t('profile.documents.openFailedTitle'),
        error instanceof Error ? error.message : t('profile.documents.openFailedMessage'),
      );
    },
    onSettled: () => {
      setOpeningId(null);
    },
  });

  const closePreview = () => {
    setPreview(null);
    setPreviewLoading(false);
    setPreviewError(null);
  };

  const handlePreviewReady = useCallback(() => {
    setPreviewLoading(false);
    setPreviewError(null);
  }, []);

  const handlePreviewError = useCallback(
    (message?: string) => {
      setPreviewLoading(false);
      setPreviewError(message?.trim() || t('profile.documents.viewerFailedMessage'));
    },
    [t],
  );

  const uploadMutation = useMutation({
    mutationFn: () =>
      providerDocumentsService.pickAndUpload({
        title,
        documentType,
        organizationId: uploadOrgId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.providerDocuments });
      setUploadOpen(false);
      setTitle('');
      setDocumentType('prescription');
      setUploadOrgId(null);
      Alert.alert(
        t('profile.documents.uploadSuccessTitle'),
        t('profile.documents.uploadSuccessMessage'),
      );
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'UPLOAD_CANCELLED') {
        return;
      }
      Alert.alert(
        t('profile.documents.uploadFailedTitle'),
        error instanceof Error ? error.message : t('profile.documents.uploadFailedMessage'),
      );
    },
  });

  const linkMutation = useMutation({
    mutationFn: (organizationId: string | null) =>
      providerDocumentsService.updateOrganization(linkDoc!.id, organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.providerDocuments });
      setLinkDoc(null);
      Alert.alert(
        t('profile.documents.linkSuccessTitle'),
        t('profile.documents.linkSuccessMessage'),
      );
    },
    onError: (error) => {
      Alert.alert(
        t('profile.documents.linkFailedTitle'),
        error instanceof Error ? error.message : t('profile.documents.linkFailedMessage'),
      );
    },
  });

  if (isGuest) {
    return (
      <Screen>
        <AppText variant="body">{t('profile.documents.guest')}</AppText>
      </Screen>
    );
  }

  if (query.isLoading) {
    return <LoadingState title={t('profile.documents.loading')} />;
  }

  if (query.isError && query.data === undefined) {
    return (
      <ErrorState
        title={t('profile.documents.loadFailed.title')}
        message={
          query.error instanceof Error
            ? query.error.message
            : t('profile.documents.loadFailed.message')
        }
        actionLabel={t('common.retry')}
        onAction={() => {
          void query.refetch();
        }}
      />
    );
  }

  const documents = query.data ?? [];

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <AppText variant="sectionTitle">{t('profile.documents.title')}</AppText>
        <AppText variant="subtitle">{t('profile.documents.subtitle')}</AppText>

        <Button
          style={[styles.uploadCta, shadow.soft]}
          onPress={() => setUploadOpen(true)}
          variant="plain"
        >
          <FilePlus2 color="#FFFFFF" size={18} strokeWidth={2.25} />
          <AppText variant="button" style={styles.uploadCtaLabel}>
            {t('profile.documents.uploadCta')}
          </AppText>
        </Button>

        {documents.length === 0 ? (
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="body">{t('profile.documents.empty')}</AppText>
          </View>
        ) : (
          documents.map((doc) => {
            const busy = openingId === doc.id;
            const canLink = doc.source === 'patient';
            const providerLabel =
              doc.organizationName ??
              (canLink
                ? t('profile.documents.noProviderYet')
                : t('profile.documents.providerFallback'));
            return (
              <View key={doc.id} style={[styles.card, shadow.soft]}>
                <Button
                  style={styles.cardMain}
                  disabled={busy || openMutation.isPending}
                  onPress={() => openMutation.mutate(doc)}
                  variant="plain"
                >
                  <View style={styles.iconRing}>
                    <FileText color={palette.primary} size={20} strokeWidth={2.25} />
                  </View>
                  <View style={styles.copy}>
                    <AppText variant="body" style={styles.docTitle}>
                      {doc.title}
                    </AppText>
                    <AppText variant="caption" style={styles.meta}>
                      {typeLabel(t, doc.documentType)}
                      {' · '}
                      {providerLabel}
                    </AppText>
                    <AppText variant="caption" style={styles.meta}>
                      {doc.source === 'patient'
                        ? t('profile.documents.uploadedOn', {
                            date: new Date(doc.createdAt).toLocaleDateString(),
                          })
                        : t('profile.documents.sharedOn', {
                            date: new Date(doc.createdAt).toLocaleDateString(),
                          })}
                    </AppText>
                    {doc.fileName ? (
                      <AppText variant="caption" style={styles.fileName} numberOfLines={1}>
                        {doc.fileName}
                      </AppText>
                    ) : null}
                    <AppText variant="caption" color="brand" style={styles.openHint}>
                      {busy ? t('profile.documents.opening') : t('profile.documents.tapToOpen')}
                    </AppText>
                  </View>
                </Button>
                {canLink ? (
                  <Button
                    style={styles.linkBtn}
                    onPress={() => setLinkDoc(doc)}
                    disabled={linkMutation.isPending}
                    variant="plain"
                  >
                    <Link2 color={palette.primary} size={16} />
                    <AppText variant="caption" color="brand" style={styles.linkBtnLabel}>
                      {doc.organizationId
                        ? t('profile.documents.changeProvider')
                        : t('profile.documents.linkProvider')}
                    </AppText>
                  </Button>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={Boolean(preview)}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closePreview}
      >
        <View style={[styles.viewerScreen, { paddingTop: insets.top }]}>
          <View style={styles.viewerHeader}>
            <Button
              accessibilityLabel={t('common.cancel')}
              onPress={closePreview}
              style={styles.viewerCancel}
              variant="plain"
            >
              <AppText variant="button" color="brand">
                {t('common.cancel')}
              </AppText>
            </Button>
            <AppText variant="cardTitle" numberOfLines={1} style={styles.viewerTitle}>
              {preview?.title ?? ''}
            </AppText>
            <View style={styles.viewerHeaderSpacer} />
          </View>

          {preview ? (
            <View style={styles.viewerBody}>
              {previewError ? (
                <View style={styles.viewerFallback}>
                  <AppText variant="sectionTitle" style={styles.viewerFallbackTitle}>
                    {t('profile.documents.viewerFailedTitle')}
                  </AppText>
                  <AppText variant="body" style={styles.meta}>
                    {previewError}
                  </AppText>
                </View>
              ) : !canPreviewInApp(preview.mimeType, preview.fileName) ? (
                <View style={styles.viewerFallback}>
                  <AppText variant="sectionTitle" style={styles.viewerFallbackTitle}>
                    {t('profile.documents.previewUnavailableTitle')}
                  </AppText>
                  <AppText variant="body" style={styles.meta}>
                    {t('profile.documents.previewUnavailableMessage')}
                  </AppText>
                </View>
              ) : isImagePreview(preview.mimeType, preview.fileName) ? (
                <ScrollView
                  contentContainerStyle={styles.imageScroll}
                  maximumZoomScale={4}
                  minimumZoomScale={1}
                >
                  <Image
                    accessibilityLabel={preview.title}
                    onLoadEnd={handlePreviewReady}
                    resizeMode="contain"
                    source={{ uri: preview.uri }}
                    style={styles.previewImage}
                  />
                </ScrollView>
              ) : Platform.OS === 'android' ? (
                <PdfDocumentPreview
                  uri={preview.uri}
                  title={preview.title}
                  onLoadEnd={handlePreviewReady}
                  onError={handlePreviewError}
                />
              ) : (
                <WebView
                  allowFileAccess
                  allowUniversalAccessFromFileURLs
                  originWhitelist={['*', 'file://', 'https://', 'http://']}
                  onLoadEnd={handlePreviewReady}
                  onError={() => handlePreviewError()}
                  setSupportMultipleWindows={false}
                  source={{ uri: preview.uri }}
                  style={styles.webView}
                />
              )}

              {previewLoading &&
              !previewError &&
              canPreviewInApp(preview.mimeType, preview.fileName) ? (
                <View style={styles.viewerLoading}>
                  <ActivityIndicator color={palette.primary} size="large" />
                  <AppText variant="caption" style={styles.meta}>
                    {t('profile.documents.viewerLoading')}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={uploadOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setUploadOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.md }]}>
            <AppText variant="sectionTitle">{t('profile.documents.uploadTitle')}</AppText>
            <FormStack>
              <FormNotice>{t('profile.documents.uploadHint')}</FormNotice>

              <FormField label={t('profile.documents.titleField')}>
                <Input
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('profile.documents.titlePlaceholder')}
                />
              </FormField>

              <FormField label={t('profile.documents.typeField')}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {PROVIDER_DOCUMENT_TYPES.map((type) => (
                    <ChoiceChip
                      key={type}
                      label={typeLabel(t, type)}
                      selected={type === documentType}
                      onPress={() => setDocumentType(type)}
                    />
                  ))}
                </ScrollView>
              </FormField>

              <FormField
                label={t('profile.documents.providerField')}
                hint={t('profile.documents.providerOptionalHint')}
              >
                <ScrollView style={styles.orgList} nestedScrollEnabled>
                  <Button
                    style={[styles.orgRow, uploadOrgId === null ? styles.orgRowActive : null]}
                    onPress={() => setUploadOrgId(null)}
                    variant="plain"
                  >
                    <AppText variant="body">{t('profile.documents.assignLater')}</AppText>
                  </Button>
                  {orgs.map((org) => (
                    <Button
                      key={org.organizationId}
                      style={[
                        styles.orgRow,
                        uploadOrgId === org.organizationId ? styles.orgRowActive : null,
                      ]}
                      onPress={() => setUploadOrgId(org.organizationId)}
                      variant="plain"
                    >
                      <AppText variant="body">{org.name}</AppText>
                    </Button>
                  ))}
                  {orgs.length === 0 ? (
                    <AppText variant="caption" style={styles.meta}>
                      {t('profile.documents.noConnectionsHint')}
                    </AppText>
                  ) : null}
                </ScrollView>
              </FormField>

              <FormActions>
                <Button
                  style={styles.secondaryBtn}
                  onPress={() => setUploadOpen(false)}
                  disabled={uploadMutation.isPending}
                  variant="plain"
                >
                  <AppText variant="button">{t('common.cancel')}</AppText>
                </Button>
                <Button
                  style={styles.primaryBtn}
                  loading={uploadMutation.isPending}
                  onPress={() => uploadMutation.mutate()}
                  variant="plain"
                >
                  <AppText variant="button" style={styles.primaryBtnLabel}>
                    {uploadMutation.isPending
                      ? t('profile.documents.uploading')
                      : t('profile.documents.chooseFile')}
                  </AppText>
                </Button>
              </FormActions>
            </FormStack>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(linkDoc)}
        animationType="slide"
        transparent
        onRequestClose={() => setLinkDoc(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.md }]}>
            <AppText variant="sectionTitle">{t('profile.documents.linkTitle')}</AppText>
            <AppText variant="caption" style={styles.meta}>
              {t('profile.documents.linkHint', {
                title: linkDoc?.title ?? '',
              })}
            </AppText>
            <ScrollView style={styles.orgList} nestedScrollEnabled>
              <Button
                style={[
                  styles.orgRow,
                  linkDoc?.organizationId == null ? styles.orgRowActive : null,
                ]}
                onPress={() => linkMutation.mutate(null)}
                disabled={linkMutation.isPending}
                variant="plain"
              >
                <AppText variant="body">{t('profile.documents.clearProvider')}</AppText>
              </Button>
              {orgs.map((org) => (
                <Button
                  key={org.organizationId}
                  style={[
                    styles.orgRow,
                    linkDoc?.organizationId === org.organizationId ? styles.orgRowActive : null,
                  ]}
                  onPress={() => linkMutation.mutate(org.organizationId)}
                  disabled={linkMutation.isPending}
                  variant="plain"
                >
                  <AppText variant="body">{org.name}</AppText>
                </Button>
              ))}
              {orgs.length === 0 ? (
                <AppText variant="caption" style={styles.meta}>
                  {t('profile.documents.noConnectionsHint')}
                </AppText>
              ) : null}
            </ScrollView>
            <Button style={styles.secondaryBtn} onPress={() => setLinkDoc(null)} variant="plain">
              <AppText variant="button">{t('common.cancel')}</AppText>
            </Button>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  uploadCta: {
    minHeight: 52,
    borderRadius: radius.full,
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  uploadCtaLabel: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: 10,
  },
  cardMain: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconRing: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  docTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  meta: {
    color: palette.textSecondary,
  },
  fileName: {
    color: palette.textSecondary,
    marginTop: 2,
  },
  openHint: {
    marginTop: 6,
    fontWeight: '600',
  },
  linkBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: palette.primaryLight,
  },
  linkBtnLabel: {
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: palette.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
    maxHeight: '88%',
  },
  chipRow: {
    gap: 8,
    paddingVertical: 4,
  },
  orgList: {
    maxHeight: 180,
  },
  orgRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.divider,
    marginBottom: 8,
  },
  orgRowActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primaryLight,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.full,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnLabel: {
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.divider,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  viewerScreen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
    backgroundColor: palette.surface,
  },
  viewerCancel: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  viewerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  viewerHeaderSpacer: {
    minWidth: 64,
  },
  viewerBody: {
    flex: 1,
    backgroundColor: '#111827',
  },
  webView: {
    flex: 1,
    backgroundColor: '#111827',
  },
  imageScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  previewImage: {
    width: '100%',
    minHeight: 320,
    height: 520,
  },
  viewerLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
  },
  viewerFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layoutSpacing.screenHorizontal,
    gap: spacing.sm,
    backgroundColor: palette.background,
  },
  viewerFallbackTitle: {
    textAlign: 'center',
  },
});
