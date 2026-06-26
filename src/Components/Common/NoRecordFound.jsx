import { useTranslation } from "react-i18next";

export default function NoRecordFound({ message }) {
  const { t } = useTranslation();
  const text = message || t("common.noRecordFound");
  return (
    <>
      <div className="no-record-found-content">
        <p>{text}</p>
      </div>
    </>
  );
}
