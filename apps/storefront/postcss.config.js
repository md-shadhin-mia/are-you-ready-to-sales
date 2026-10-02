module.exports = {
  plugins: {
    // Inline shared token CSS (resolved via @repo/ui package exports) before Tailwind runs.
    "postcss-import": {
      resolve: (id) => (id.startsWith("@repo/") ? require.resolve(id) : id),
    },
    tailwindcss: {},
    autoprefixer: {},
  },
};
