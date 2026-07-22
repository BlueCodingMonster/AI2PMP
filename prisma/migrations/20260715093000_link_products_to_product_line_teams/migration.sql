-- Allow product-line teams and global products to be associated many-to-many.
CREATE TABLE "_ProductLineTeamProducts" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "_ProductLineTeamProducts_AB_unique" ON "_ProductLineTeamProducts"("A", "B");
CREATE INDEX "_ProductLineTeamProducts_B_index" ON "_ProductLineTeamProducts"("B");

ALTER TABLE "_ProductLineTeamProducts"
  ADD CONSTRAINT "_ProductLineTeamProducts_A_fkey"
  FOREIGN KEY ("A") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ProductLineTeamProducts"
  ADD CONSTRAINT "_ProductLineTeamProducts_B_fkey"
  FOREIGN KEY ("B") REFERENCES "product_line_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
