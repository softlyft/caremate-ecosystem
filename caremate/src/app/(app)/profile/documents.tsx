import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FilePlus2, FileText, Link2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { PressableScale } from '@/components/motion/PressableScale';
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
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

function typeLabel(
  t: (key: string, params?: Record<string, string | number>) => string,
  documentType: ProviderDocumentType,
): string {
  return t(`profile.documents.types.${documentType}`);
}

export default function ProviderDocumentsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isGuest = useIsGuest();
  const queryClient = useQueryClient();
  const [openingId, setOpeningId] = useState<string | null>(null);
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
    mutationFn: async (doc: ProviderDocument) => {
      const url = await providerDocumentsService.createViewUrl(doc.filePath);
      await WebBrowser.openBrowserAsync(url);
    },
    onMutate: (doc) => {
      setOpeningId(doc.id);
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

        <PressableScale style={[styles.uploadCta, shadow.soft]} onPress={() => setUploadOpen(true)}>
          <FilePlus2 color="#FFFFFF" size={18} strokeWidth={2.25} />
          <AppText variant="button" style={styles.uploadCtaLabel}>
            {t('profile.documents.uploadCta')}
          </AppText>
        </PressableScale>

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
                <PressableScale
                  style={styles.cardMain}
                  disabled={busy || openMutation.isPending}
                  onPress={() => openMutation.mutate(doc)}
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
                </PressableScale>
                {canLink ? (
                  <PressableScale
                    style={styles.linkBtn}
                    onPress={() => setLinkDoc(doc)}
                    disabled={linkMutation.isPending}
                  >
                    <Link2 color={palette.primary} size={16} />
                    <AppText variant="caption" color="brand" style={styles.linkBtnLabel}>
                      {doc.organizationId
                        ? t('profile.documents.changeProvider')
                        : t('profile.documents.linkProvider')}
                    </AppText>
                  </PressableScale>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

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
              placeholderTextColor="#9CA3AF"
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
                  <Pressable
                    key={type}
                    style={[styles.chip, active ? styles.chipActive : null]}
                    onPress={() => setDocumentType(type)}
                  >
                    <AppText
                      variant="caption"
                      style={[styles.chipLabel, active ? styles.chipLabelActive : null]}
                    >
                      {typeLabel(t, type)}
                    </AppText>
                  </Pressable>
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
              <Pressable
                style={[styles.orgRow, uploadOrgId === null ? styles.orgRowActive : null]}
                onPress={() => setUploadOrgId(null)}
              >
                <AppText variant="body">{t('profile.documents.assignLater')}</AppText>
              </Pressable>
              {orgs.map((org) => (
                <Pressable
                  key={org.organizationId}
                  style={[
                    styles.orgRow,
                    uploadOrgId === org.organizationId ? styles.orgRowActive : null,
                  ]}
                  onPress={() => setUploadOrgId(org.organizationId)}
                >
                  <AppText variant="body">{org.name}</AppText>
                </Pressable>
              ))}
              {orgs.length === 0 ? (
                <AppText variant="caption" style={styles.meta}>
                  {t('profile.documents.noConnectionsHint')}
                </AppText>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <PressableScale
                style={styles.secondaryBtn}
                onPress={() => setUploadOpen(false)}
                disabled={uploadMutation.isPending}
              >
                <AppText variant="button">{t('common.cancel')}</AppText>
              </PressableScale>
              <PressableScale
                style={[styles.primaryBtn, uploadMutation.isPending ? styles.disabled : null]}
                disabled={uploadMutation.isPending}
                onPress={() => uploadMutation.mutate()}
              >
                <AppText variant="button" style={styles.primaryBtnLabel}>
                  {uploadMutation.isPending
                    ? t('profile.documents.uploading')
                    : t('profile.documents.chooseFile')}
                </AppText>
              </PressableScale>
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
              <Pressable
                style={[
                  styles.orgRow,
                  linkDoc?.organizationId == null ? styles.orgRowActive : null,
                ]}
                onPress={() => linkMutation.mutate(null)}
                disabled={linkMutation.isPending}
              >
                <AppText variant="body">{t('profile.documents.clearProvider')}</AppText>
              </Pressable>
              {orgs.map((org) => (
                <Pressable
                  key={org.organizationId}
                  style={[
                    styles.orgRow,
                    linkDoc?.organizationId === org.organizationId ? styles.orgRowActive : null,
                  ]}
                  onPress={() => linkMutation.mutate(org.organizationId)}
                  disabled={linkMutation.isPending}
                >
                  <AppText variant="body">{org.name}</AppText>
                </Pressable>
              ))}
              {orgs.length === 0 ? (
                <AppText variant="caption" style={styles.meta}>
                  {t('profile.documents.noConnectionsHint')}
                </AppText>
              ) : null}
            </ScrollView>
            <PressableScale style={styles.secondaryBtn} onPress={() => setLinkDoc(null)}>
              <AppText variant="button">{t('common.cancel')}</AppText>
            </PressableScale>
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
  disabled: {
    opacity: 0.6,
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
});
