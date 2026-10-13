import i18n from "../../i18n";
const ContactUs = () => {
    return (
        <div className="p-4">
            <span className="text-2xl font-bold mb-4">{i18n.t("help.contactUs")}</span>

            <p className="text-lg mb-4">
                {i18n.t("help.haveQuestionsOrNeed")}
            </p>

            <div className="mb-4">
                <span className="text-xl font-bold mb-2">{i18n.t("auth.emailShort")}</span>
                <p className="text-lg">
                    Send us an email at <a href="mailto:novadrake76@gmail.com" className="text-secondary">{i18n.t("help.novadrake76GmailCom")}</a>.
                </p>
            </div>
        </div>
    );
};

export default ContactUs;
