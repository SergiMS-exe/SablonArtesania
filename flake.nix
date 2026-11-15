{
  description = "Sablon Artesania: Astro 7 / Node.js 24 / Drizzle + SQLite";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        name = "sablon-artesania";
        packages = with pkgs; [
          nodejs_24
          sqlite
          git
          curl
          jq
          docker-client
          docker-compose
        ];
        shellHook = ''
          echo "sablon-artesania: Node $(node --version), npm $(npm --version)"
          echo "  cp .env.example .env"
          echo "  npm install"
          echo "  npm run dev                   # http://localhost:4321"
          echo "  npm run build && npm run start"
          echo "  npm run db:generate|db:migrate|db:seed|db:bootstrap"
        '';
      };

      formatter.${system} = pkgs.nixfmt-rfc-style;
    };
}
