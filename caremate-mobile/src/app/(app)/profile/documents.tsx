import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FilePlus2, FileText, Link2 } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Button } from '@/components/ui/form-controls';

import { AppText } from '@/components/ui/AppText';
import { ErrorState, LoadingState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import {
  PROVIDER_DOCUMENT_TYPES,
  providerDocumentsService,
  type ProviderDocument,
  type ProviderDocumentType,
} from '@/domains/providers/documents-service';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, shadow, spacing, textColors } from '@/theme';

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
  };

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
      <View style={styles.padded}>
        <AppText variant="body">{t('profile.documents.guest')}</AppText>
      </View>
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
    <View style={styles.screen}>
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
              {!canPreviewInApp(preview.mimeType, preview.fileName) ? (
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
                    onLoadEnd={() => setPreviewLoading(false)}
                    resizeMode="contain"
                    source={{ uri: preview.uri }}
                    style={styles.previewImage}
                  />
                </ScrollView>
              ) : (
                <WebView
                  allowFileAccess
                  allowUniversalAccessFromFileURLs
                  originWhitelist={['*', 'file://', 'https://', 'http://']}
                  onLoadEnd={() => setPreviewLoading(false)}
                  onError={() => setPreviewLoading(false)}
                  setSupportMultipleWindows={false}
                  source={{
                    // iOS WKWebView renders local/remote PDFs; Android WebView handles https PDFs better than file://.
                    uri:
                      Platform.OS === 'android' && isPdfPreview(preview.mimeType, preview.fileName)
                        ? preview.remoteUrl
                        : preview.uri,
                  }}
                  style={styles.webView}
                />
              )}

              {previewLoading && canPreviewInApp(preview.mimeType, preview.fileName) ? (
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
            <AppText variant="caption" style={styles.meta}>
              {t('profile.documents.uploadHint')}
            </AppText>

            <AppText variant="caption" style={styles.fieldLabel}>
              {t('profile.documents.titleField')}
            </AppText>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('profile.documents.titlePlaceholder')}
              placeholderTextColor={textColors.placeholder}
            />

            <AppText variant="caption" style={styles.fieldLabel}>
              {t('profile.documents.typeField')}
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {PROVIDER_DOCUMENT_TYPES.map((type) => {
                const active = type === documentType;
                return (
                  <Button
                    key={type}
                    style={[styles.chip, active ? styles.chipActive : null]}
                    onPress={() => setDocumentType(type)}
                    variant="plain"
                  >
                    <AppText
                      variant="caption"
                      style={[styles.chipLabel, active ? styles.chipLabelActive : null]}
                    >
                      {typeLabel(t, type)}
                    </AppText>
                  </Button>
                );
              })}
            </ScrollView>

            <AppText variant="caption" style={styles.fieldLabel}>
              {t('profile.documents.providerField')}
            </AppText>
            <AppText variant="caption" style={styles.meta}>
              {t('profile.documents.providerOptionalHint')}
            </AppText>
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

            <View style={styles.modalActions}>
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
            </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  padded: {
    flex: 1,
    padding: layoutSpacing.screenHorizontal,
    justifyContent: 'center',
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
  fieldLabel: {
    marginTop: spacing.sm,
    fontWeight: '600',
    color: palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.divider,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: palette.text,
    fontSize: 15,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.divider,
    backgroundColor: palette.surface,
  },
  chipActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primaryLight,
  },
  chipLabel: {
    color: palette.textSecondary,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: palette.primary,
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
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.sm,
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
