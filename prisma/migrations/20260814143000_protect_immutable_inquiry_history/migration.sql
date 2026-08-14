ALTER TABLE "inquiry_follow_up"
DROP CONSTRAINT "inquiry_follow_up_inquiry_id_fkey";

ALTER TABLE "inquiry_follow_up"
ADD CONSTRAINT "inquiry_follow_up_inquiry_id_fkey"
FOREIGN KEY ("inquiry_id") REFERENCES "inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inquiry_status_change"
DROP CONSTRAINT "inquiry_status_change_inquiry_id_fkey";

ALTER TABLE "inquiry_status_change"
ADD CONSTRAINT "inquiry_status_change_inquiry_id_fkey"
FOREIGN KEY ("inquiry_id") REFERENCES "inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION reject_immutable_inquiry_history_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    OR (
      TG_OP = 'DELETE'
      AND current_setting('torquelis.allow_inquiry_history_delete', true) IS DISTINCT FROM 'on'
    )
  THEN
    RAISE EXCEPTION '% records are immutable', TG_TABLE_NAME;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
