declare module '@evergreen-learn' {
  const value: Record<
    string,
    Array<{
      id: string;
      title: string;
      summary: string;
      content: string;
    }>
  >;
  export default value;
}
