// module.exports = {
//   plugins: {
//     'postcss-import': {},
//     'postcss-nesting': {
//       noIsPseudoSelector: true
//     },
//     'postcss-flexbugs-fixes': {},
//     'postcss-preset-env': {
//       autoprefixer: {
//         flexbox: 'no-2009'
//       },
//       stage: 3,
//       features: {
//         'nesting-rules': true,
//         'custom-properties': false
//       }
//     },
//     tailwindcss: {}
//   }
// };

export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {}
  }
};
