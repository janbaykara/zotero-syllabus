import { assert } from "chai";
import { isVideoGalleryItemFromTypeAndUrl } from "../src/utils/itemCover";

describe("isVideoGalleryItemFromTypeAndUrl", function () {
  const playlist =
    "https://www.youtube.com/playlist?list=PLE03jn2k3GYDlN1TdIADqMTwzm7CnlHp6";
  const watch = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

  it("does not treat a book as video because of a YouTube attachment URL", function () {
    assert.isFalse(isVideoGalleryItemFromTypeAndUrl("book", playlist));
    assert.isFalse(isVideoGalleryItemFromTypeAndUrl("book", watch));
  });

  it("still treats film and video recordings as video", function () {
    assert.isTrue(isVideoGalleryItemFromTypeAndUrl("videoRecording", null));
    assert.isTrue(isVideoGalleryItemFromTypeAndUrl("film", playlist));
  });

  it("treats a webpage whose URL is YouTube as video", function () {
    assert.isTrue(isVideoGalleryItemFromTypeAndUrl("webpage", watch));
    assert.isTrue(isVideoGalleryItemFromTypeAndUrl("webpage", playlist));
    assert.isFalse(
      isVideoGalleryItemFromTypeAndUrl(
        "webpage",
        "https://mscp.org.au/past-courses/people-think",
      ),
    );
  });
});
