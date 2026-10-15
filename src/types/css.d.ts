// Web'de kullanılan CSS / CSS Modules importları için tip bildirimleri.
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.css';
