# 概要
web-frontendとweb-backendのアプリケーションです。
どちらもTypeScript書かれたアプリケーションで、web-frontendはReactを使用しており、web-backendはExpressを使用しています。

1. web-backendは、web-frontendのビルド成果物コンテンツとして提供します。
2. web-frontendは、ドメイン駆動設計・レイヤードアーキテクチャを採用しています。
3. web-frontendは世界の時刻を表示するアプリケーションでドメインにRootEntity、AreaEntity、CountryEntity、CityEntityを持ちます。
4. プレゼンテーションも同じような階層構造で最下位にコンポーネントで時刻が表示され、各階層で地域名、国名、都市名が表示されます。