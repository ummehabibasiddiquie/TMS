const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const cols = await p.$queryRawUnsafe("SHOW COLUMNS FROM ProjectCertification");
  const count = await p.projectCertification.count();
  console.log(
    "cols",
    cols.map((c) => c.Field).join(",")
  );
  console.log("count", count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
