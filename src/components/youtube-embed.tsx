interface YoutubeEmbedProps {
  url: string;
}

const YoutubeEmbed = ({ url }: YoutubeEmbedProps) => {
  const getEmbedUrl = (youtubeUrl: string) => {
    let videoId;
    try {
      const urlObject = new URL(youtubeUrl);
      if (urlObject.hostname === 'youtu.be') {
        videoId = urlObject.pathname.substring(1);
      } else {
        videoId = urlObject.searchParams.get('v');
      }
    } catch (e) {
      return null;
    }
    
    if (!videoId) return null;

    return `https://www.youtube.com/embed/${videoId}`;
  };

  const embedUrl = getEmbedUrl(url);

  if (!embedUrl) {
    return <p className="text-red-500">URL de YouTube inválida.</p>;
  }

  return (
    <div className="aspect-video overflow-hidden rounded-lg">
      <iframe
        width="100%"
        height="100%"
        src={embedUrl}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Embedded youtube"
      />
    </div>
  );
};

export default YoutubeEmbed;
